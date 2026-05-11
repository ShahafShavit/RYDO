#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RydoStack } from '../lib/rydo-stack';

const app = new cdk.App();

new RydoStack(app, 'RydoStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'RYDO school demo: ECR, ECS Fargate (API + SQL sidecar), ALB, CloudFront',
});

app.synth();
