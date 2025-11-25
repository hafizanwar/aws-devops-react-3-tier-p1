# ECR Module

This module creates Amazon Elastic Container Registry (ECR) repositories for storing Docker images with security scanning, lifecycle policies, and encryption.

## Features

- Multiple ECR repositories for different services
- Image scanning on push for vulnerability detection
- Lifecycle policies to manage image retention
- Encryption at rest using AWS KMS
- Cross-account access policies (optional)
- Immutable image tags (optional)

## Usage

```hcl
module "ecr" {
  source = "./modules/ecr"

  repository_names = ["frontend", "backend", "database"]
  environment      = "dev"
  
  enable_image_scanning = true
  image_tag_mutability  = "MUTABLE"
  
  lifecycle_policy = {
    max_image_count = 10
  }
  
  tags = {
    Project = "ecommerce"
  }
}
```

## Input Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `repository_names` | List of repository names to create | `list(string)` | - | yes |
| `environment` | Environment name (dev, staging, prod) | `string` | `"dev"` | no |
| `enable_image_scanning` | Enable image scanning on push | `bool` | `true` | no |
| `image_tag_mutability` | Image tag mutability (MUTABLE or IMMUTABLE) | `string` | `"MUTABLE"` | no |
| `encryption_type` | Encryption type (AES256 or KMS) | `string` | `"AES256"` | no |
| `kms_key_id` | KMS key ID for encryption (if encryption_type is KMS) | `string` | `null` | no |
| `lifecycle_policy` | Lifecycle policy configuration | `object` | See below | no |
| `enable_cross_account_access` | Enable cross-account access | `bool` | `false` | no |
| `cross_account_ids` | List of AWS account IDs for cross-account access | `list(string)` | `[]` | no |
| `tags` | Additional tags for repositories | `map(string)` | `{}` | no |

### Lifecycle Policy Object

```hcl
lifecycle_policy = {
  max_image_count = 10           # Keep last N images
  expire_untagged_days = 7       # Delete untagged images after N days
}
```

## Outputs

| Name | Description |
|------|-------------|
| `repository_urls` | Map of repository names to URLs |
| `repository_arns` | Map of repository names to ARNs |
| `repository_registry_ids` | Map of repository names to registry IDs |

## Resources Created

### ECR Repositories
- One repository per name in `repository_names`
- Each repository includes:
  - Unique repository URL
  - Image scanning configuration
  - Lifecycle policy
  - Encryption settings
  - Access policies

### Lifecycle Policies
- Automatically applied to each repository
- Manages image retention
- Reduces storage costs

## Image Scanning

### Scan on Push

When enabled, ECR automatically scans images for vulnerabilities:

```hcl
enable_image_scanning = true
```

**Scanning Process:**
1. Image pushed to ECR
2. ECR scans image layers
3. Vulnerabilities reported in console
4. Scan results available via API

**Vulnerability Database:**
- Common Vulnerabilities and Exposures (CVE)
- Updated daily by AWS

### View Scan Results

```bash
# List images
aws ecr list-images --repository-name frontend

# Get scan findings
aws ecr describe-image-scan-findings \
  --repository-name frontend \
  --image-id imageTag=latest
```

### Scan Results in CI/CD

```yaml
# GitHub Actions example
- name: Check scan results
  run: |
    SCAN_STATUS=$(aws ecr describe-image-scan-findings \
      --repository-name frontend \
      --image-id imageTag=${{ github.sha }} \
      --query 'imageScanFindings.findingSeverityCounts' \
      --output json)
    
    CRITICAL=$(echo $SCAN_STATUS | jq '.CRITICAL // 0')
    if [ "$CRITICAL" -gt 0 ]; then
      echo "Critical vulnerabilities found!"
      exit 1
    fi
```

## Lifecycle Policies

### Keep Last N Images

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

### Expire Untagged Images

```json
{
  "rules": [
    {
      "rulePriority": 2,
      "description": "Delete untagged images after 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

### Production Policy

```hcl
lifecycle_policy = {
  max_image_count      = 30
  expire_untagged_days = 14
}
```

## Image Tag Mutability

### Mutable Tags (Default)

```hcl
image_tag_mutability = "MUTABLE"
```

- Tags can be overwritten
- Useful for `latest` tag
- Flexible for development

### Immutable Tags

```hcl
image_tag_mutability = "IMMUTABLE"
```

- Tags cannot be overwritten
- Prevents accidental overwrites
- Recommended for production
- Ensures reproducibility

## Encryption

### AES256 (Default)

```hcl
encryption_type = "AES256"
```

- AWS-managed encryption
- No additional cost
- Automatic key rotation

### KMS

```hcl
encryption_type = "KMS"
kms_key_id      = "arn:aws:kms:us-east-1:123456789:key/xxx"
```

- Customer-managed keys
- Additional cost (~$1/month per key)
- Audit trail in CloudTrail
- Custom key policies

## Cross-Account Access

Enable other AWS accounts to pull images:

```hcl
enable_cross_account_access = true
cross_account_ids = [
  "123456789012",
  "987654321098"
]
```

**Generated Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountPull",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::123456789012:root",
          "arn:aws:iam::987654321098:root"
        ]
      },
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
    }
  ]
}
```

## Pushing Images

### Login to ECR

```bash
# Get login password
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Tag and Push

```bash
# Build image
docker build -t frontend:latest .

# Tag for ECR
docker tag frontend:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest

# Push to ECR
docker push \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest
```

### Multi-tag Push

```bash
# Tag with version and latest
docker tag frontend:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:v1.0.0

docker tag frontend:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest

# Push both tags
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:v1.0.0
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest
```

## Pulling Images

### From EKS

EKS nodes automatically have permission to pull from ECR in the same account.

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest
```

### From Local Machine

```bash
# Login first
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Pull image
docker pull <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest
```

## Cost Considerations

### Storage Costs

- **First 50 GB**: $0.10/GB per month
- **Next 450 GB**: $0.09/GB per month
- **Next 9.5 TB**: $0.08/GB per month
- **Over 10 TB**: $0.07/GB per month

### Data Transfer Costs

- **To Internet**: $0.09/GB (first 10 TB)
- **To EKS (same region)**: Free
- **To EC2 (same region)**: Free
- **Cross-region**: $0.02/GB

### Example Costs

**Scenario**: 3 repositories, 10 images each, 500 MB per image

- Storage: 15 GB × $0.10 = $1.50/month
- Data transfer (to EKS): $0/month
- **Total**: ~$1.50/month

### Cost Optimization

1. **Lifecycle Policies**: Delete old images automatically
2. **Compress Images**: Use multi-stage builds
3. **Share Base Images**: Reduce duplicate layers
4. **Regional Replication**: Only when necessary

## Security Best Practices

1. **Enable Image Scanning**: Detect vulnerabilities early
2. **Use Immutable Tags**: Prevent tag overwrites in production
3. **Encrypt at Rest**: Use KMS for sensitive images
4. **Least Privilege**: Grant minimal IAM permissions
5. **Private Repositories**: Never make repositories public
6. **Scan Before Deploy**: Block vulnerable images in CI/CD
7. **Regular Updates**: Keep base images updated

## Monitoring

### CloudWatch Metrics

ECR publishes metrics to CloudWatch:

- `RepositoryPullCount`: Number of pulls
- `RepositoryPushCount`: Number of pushes

### CloudWatch Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "ecr_push_failures" {
  alarm_name          = "ecr-push-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "RepositoryPushCount"
  namespace           = "AWS/ECR"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert on ECR push failures"
}
```

## Troubleshooting

### Issue: Authentication failed

**Solution**: Refresh ECR login

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Issue: Image push denied

**Solution**: Check IAM permissions

```bash
# Required permissions
ecr:GetAuthorizationToken
ecr:BatchCheckLayerAvailability
ecr:PutImage
ecr:InitiateLayerUpload
ecr:UploadLayerPart
ecr:CompleteLayerUpload
```

### Issue: EKS can't pull image

**Solution**: Verify node IAM role has `AmazonEC2ContainerRegistryReadOnly` policy

```bash
aws iam list-attached-role-policies --role-name eks-node-role
```

### Issue: Lifecycle policy not working

**Solution**: Check policy syntax and test

```bash
aws ecr get-lifecycle-policy --repository-name frontend
aws ecr start-lifecycle-policy-preview --repository-name frontend
```

## Examples

### Development Environment

```hcl
module "ecr" {
  source = "./modules/ecr"

  repository_names = ["frontend", "backend"]
  environment      = "dev"
  
  enable_image_scanning = true
  image_tag_mutability  = "MUTABLE"
  
  lifecycle_policy = {
    max_image_count      = 5
    expire_untagged_days = 3
  }
}
```

### Production Environment

```hcl
module "ecr" {
  source = "./modules/ecr"

  repository_names = ["frontend", "backend", "database"]
  environment      = "production"
  
  enable_image_scanning = true
  image_tag_mutability  = "IMMUTABLE"
  encryption_type       = "KMS"
  kms_key_id           = aws_kms_key.ecr.id
  
  lifecycle_policy = {
    max_image_count      = 30
    expire_untagged_days = 14
  }
  
  tags = {
    Compliance = "pci-dss"
    Backup     = "required"
  }
}
```

### Multi-Account Setup

```hcl
module "ecr" {
  source = "./modules/ecr"

  repository_names = ["shared-frontend", "shared-backend"]
  environment      = "shared"
  
  enable_cross_account_access = true
  cross_account_ids = [
    "123456789012",  # Dev account
    "987654321098",  # Prod account
  ]
}
```

## References

- [Amazon ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [ECR Lifecycle Policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html)
- [ECR Image Scanning](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
