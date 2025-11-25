# GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflow for the three-tier e-commerce application.

## Workflow Overview

The CI/CD pipeline consists of three main jobs:

### 1. Test Job
- Triggers on push to main branch and pull requests
- Checks out code
- Sets up Node.js 18
- Installs dependencies for both frontend and backend
- Runs ESLint on frontend and backend code
- Runs backend unit tests

### 2. Build Job
- Depends on successful completion of test job
- Only runs on push to main branch (not on PRs)
- Configures AWS credentials
- Logs into Amazon ECR
- Builds Docker images for frontend, backend, and database
- Tags images with commit SHA (first 7 characters) and 'latest'
- Runs Trivy security scans on all images
- Pushes images to Amazon ECR

### 3. Deploy Job
- Depends on successful completion of build job
- Only runs on push to main branch (not on PRs)
- Configures AWS credentials
- Updates kubeconfig for EKS cluster
- Updates Kubernetes manifests with new image tags
- Applies manifests to EKS cluster
- Waits for rollout completion
- Verifies all pods are running and healthy
- Sends notification on failure

## Required GitHub Secrets

Configure the following secrets in your GitHub repository settings:

- `AWS_ACCESS_KEY_ID`: AWS access key with permissions for ECR and EKS
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_REGION`: AWS region (default: us-east-1)
- `EKS_CLUSTER_NAME`: Name of the EKS cluster (default: ecommerce-cluster)

## Required AWS Permissions

The AWS credentials must have the following permissions:

### ECR Permissions
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`
- `ecr:PutImage`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`

### EKS Permissions
- `eks:DescribeCluster`
- `eks:ListClusters`

### Kubernetes Permissions
- Full access to the EKS cluster (configured via aws-auth ConfigMap)

## Workflow Triggers

The workflow can be triggered in three ways:

1. **Push to main branch**: Runs all three jobs (test, build, deploy)
2. **Pull request to main branch**: Runs only the test job
3. **Manual trigger**: Can be triggered manually from the Actions tab

## Image Tagging Strategy

Images are tagged with two tags:
- **Commit SHA**: First 7 characters of the git commit SHA (e.g., `abc1234`)
- **Latest**: Always points to the most recent build

This allows for:
- Easy rollback to specific versions
- Traceability of deployed code
- Quick access to the latest version

## Security Scanning

All Docker images are scanned with Trivy for security vulnerabilities:
- Scans for CRITICAL and HIGH severity vulnerabilities
- Results are saved as SARIF files
- Scans continue even if vulnerabilities are found (continue-on-error: true)
- In production, you may want to fail the build on critical vulnerabilities

## Deployment Verification

The deploy job includes comprehensive verification:
1. Waits for StatefulSet and Deployment rollouts to complete (5-minute timeout)
2. Checks that all pods are in Running state
3. Checks that all pods are Ready
4. Displays service endpoints
5. Fails the deployment if any verification step fails

## Notifications

The workflow includes a notification step that runs on failure:
- Currently logs failure information to console
- Can be extended to send notifications to Slack, email, or other services
- Uncomment and configure the Slack webhook example to enable Slack notifications

## Local Testing

To test the workflow locally, you can use [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash  # Linux

# Run the workflow
act push -s AWS_ACCESS_KEY_ID=xxx -s AWS_SECRET_ACCESS_KEY=yyy
```

## Troubleshooting

### Test Job Fails
- Check ESLint configuration in package.json
- Ensure all dependencies are properly installed
- Review test output for specific failures

### Build Job Fails
- Verify AWS credentials are correct
- Check ECR repository names match the workflow
- Ensure Docker builds succeed locally
- Review Trivy scan results for critical vulnerabilities

### Deploy Job Fails
- Verify EKS cluster name and region are correct
- Check that kubectl has proper permissions
- Ensure Kubernetes manifests are valid
- Review pod logs for application errors: `kubectl logs -n ecommerce-app <pod-name>`

## Future Enhancements

- Add code coverage reporting
- Implement staging environment deployment
- Add smoke tests after deployment
- Implement blue-green or canary deployment strategies
- Add automatic rollback on deployment failure
- Integrate with monitoring and alerting systems
