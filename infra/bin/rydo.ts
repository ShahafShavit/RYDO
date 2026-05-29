#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RydoStack } from '../lib/rydo-stack';

const app = new cdk.App();

const domainName = process.env.DOMAIN_NAME?.trim() || undefined;

new RydoStack(app, 'RydoStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  domainName,
  description: domainName
    ? `RYDO: ECR, ECS Fargate, ALB, CloudFront (${domainName})`
    : 'RYDO school demo: ECR, ECS Fargate (API + SQL sidecar), ALB, CloudFront',
});

app.synth();
