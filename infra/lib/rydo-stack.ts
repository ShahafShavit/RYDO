import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

/** Same SA password as local docker-compose (SQL Server complexity requirements). */
const MSSQL_SA_PASSWORD = 'Your_password123';

export class RydoStack extends cdk.Stack {
  public readonly ecrRepository: ecr.Repository;
  public readonly cloudFrontUrl: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.ecrRepository = new ecr.Repository(this, 'RydoAppRepo', {
      repositoryName: 'rydo-app',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const logGroup = new logs.LogGroup(this, 'RydoLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 8192,
      cpu: 2048,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },
    });

    const sqlContainer = taskDef.addContainer('mssql', {
      essential: true,
      image: ecs.ContainerImage.fromRegistry('mcr.microsoft.com/mssql/server:2022-latest'),
      memoryReservationMiB: 3072,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'mssql',
        logGroup,
      }),
      environment: {
        ACCEPT_EULA: 'Y',
        MSSQL_SA_PASSWORD,
      },
    });
    sqlContainer.addPortMappings({
      containerPort: 1433,
      protocol: ecs.Protocol.TCP,
    });

    const connectionString = `Server=127.0.0.1,1433;Database=Rydo;User Id=sa;Password=${MSSQL_SA_PASSWORD};TrustServerCertificate=True;Encrypt=False`;

    const appContainer = taskDef.addContainer('app', {
      essential: true,
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
      memoryReservationMiB: 512,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'app',
        logGroup,
      }),
      environment: {
        ASPNETCORE_ENVIRONMENT: 'Production',
        // Must match Dockerfile (Kestrel listen). Used when resolving in-container loopback URLs (dev-only bots).
        ASPNETCORE_URLS: 'http://+:8080',
        ConnectionStrings__DefaultConnection: connectionString,
        Jwt__Key: 'rydo-prod-jwt-signing-key-min-32-chars-long!!',
        Jwt__Issuer: 'rydo',
        Jwt__Audience: 'rydo-client',
        // Dev-only features; explicit off for AWS even if appsettings merge changes.
        Rydo__DemoClubChatSimulator__Enabled: 'false',
        Rydo__DemoRideLiveBots__Enabled: 'false',
      },
    });
    appContainer.addPortMappings({
      containerPort: 8080,
      protocol: ecs.Protocol.TCP,
    });

    appContainer.addContainerDependencies({
      container: sqlContainer,
      condition: ecs.ContainerDependencyCondition.START,
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
    });

    const listener = alb.addListener('Http', {
      port: 80,
      open: true,
    });

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      healthCheckGracePeriod: cdk.Duration.seconds(120),
    });

    listener.addTargets('AppTg', {
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [
        service.loadBalancerTarget({
          containerName: 'app',
          containerPort: 8080,
        }),
      ],
      healthCheck: {
        path: '/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    const dist = new cloudfront.Distribution(this, 'CfDist', {
      comment: 'RYDO demo (ALB origin)',
      defaultBehavior: {
        origin: new origins.HttpOrigin(alb.loadBalancerDnsName, {
          httpPort: 80,
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          // Viewer uses HTTPS (see viewerProtocolPolicy); origin hop is HTTP, so the app would
          // otherwise see http:// for og:url / og:image. Kestrel reads this for %SITE_ORIGIN%.
          customHeaders: {
            'X-Rydo-Public-Origin-Proto': 'https',
          },
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    this.cloudFrontUrl = `https://${dist.distributionDomainName}`;

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'docker tag/push: docker tag rydo-app:latest <uri>:latest && docker push ...',
    });

    new cdk.CfnOutput(this, 'AlbDns', {
      value: alb.loadBalancerDnsName,
      description: 'Direct ALB (HTTP) — prefer CloudFront URL for HTTPS',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: this.cloudFrontUrl,
      description: 'Public HTTPS URL (CloudFront -> ALB -> ECS)',
    });

    new cdk.CfnOutput(this, 'PushImageHint', {
      value: `aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${this.ecrRepository.repositoryUri.split('/')[0]}`,
    });

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: cluster.clusterName,
      description: 'Used by scripts/deploy-aws.sh to force a new deployment',
    });

    new cdk.CfnOutput(this, 'EcsServiceName', {
      value: service.serviceName,
      description: 'Used by scripts/deploy-aws.sh to force a new deployment',
    });
  }
}
