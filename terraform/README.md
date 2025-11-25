# AWS DevOps Three-Tier Infrastructure

This Terraform configuration provisions a complete AWS infrastructure for deploying a three-tier e-commerce application on Amazon EKS with monitoring capabilities.

## Architecture Overview

The infrastructure includes:
- **VPC** with public and private subnets across 2 availability zones
- **EKS Cluster** (Kubernetes 1.28+) with managed node groups
- **ECR Repositories** for Docker images (frontend, backend, database)
- **Security Groups** for network isolation and communication
- **NAT Gateways** for private subnet internet access
- **IAM Roles and Policies** for EKS cluster and node operations

## Prerequisites

Before you begin, ensure you have the following installed:

- [Terraform](https://www.terraform.io/downloads.html) >= 1.5.0
- [AWS CLI](https://aws.amazon.com/cli/) >= 2.0
- [kubectl](https://kubernetes.io/docs/tasks/tools/) >= 1.28
- AWS account with appropriate permissions

## AWS Credentials

Configure your AWS credentials:

```bash
aws configure
```

Or set environment variables:

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

## Setup Instructions

### 1. Create S3 Backend (First Time Only)

Before running Terraform, create an S3 bucket and DynamoDB table for state management:

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket terraform-state-aws-devops-three-tier \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket terraform-state-aws-devops-three-tier \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket terraform-state-aws-devops-three-tier \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Configure Variables

Copy the example variables file and customize it:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your desired configuration:

```hcl
aws_region  = "us-east-1"
environment = "dev"
cluster_name = "my-eks-cluster"
# ... other variables
```

### 3. Initialize Terraform

```bash
terraform init
```

### 4. Plan Infrastructure

Review the resources that will be created:

```bash
terraform plan
```

### 5. Apply Infrastructure

Create the infrastructure:

```bash
terraform apply
```

Type `yes` when prompted to confirm.

**Note:** This process takes approximately 15-20 minutes to complete.

### 6. Configure kubectl

After the infrastructure is created, configure kubectl to access your EKS cluster:

```bash
aws eks update-kubeconfig --region us-east-1 --name aws-devops-three-tier-eks
```

Verify the connection:

```bash
kubectl get nodes
```

You should see your worker nodes listed.

## Module Structure

```
terraform/
├── main.tf                 # Main configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── providers.tf            # Provider configuration
├── terraform.tfvars        # Variable values (create from .example)
└── modules/
    ├── vpc/                # VPC and networking
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── eks/                # EKS cluster and node groups
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── ecr/                # Container registries
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── security_groups/    # Security group rules
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

## Outputs

After successful deployment, Terraform will output:

- `vpc_id` - VPC identifier
- `eks_cluster_name` - EKS cluster name
- `eks_cluster_endpoint` - EKS API server endpoint
- `ecr_repository_urls` - ECR repository URLs for pushing images
- `kubeconfig_command` - Command to configure kubectl

## Accessing ECR Repositories

To push Docker images to ECR:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag your image
docker tag frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest

# Push image
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest
```

## Cost Estimation

Approximate monthly costs (us-east-1):

- EKS Cluster: $73/month
- EC2 Instances (2x t3.medium): ~$60/month
- NAT Gateways (2): ~$65/month
- EBS Volumes: ~$10/month
- Data Transfer: Variable

**Total: ~$208/month** (excluding data transfer)

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

Type `yes` when prompted to confirm.

**Warning:** This will permanently delete all resources. Ensure you have backups of any important data.

## Troubleshooting

### Issue: Terraform state lock

If Terraform is interrupted, you may need to manually unlock the state:

```bash
terraform force-unlock <lock-id>
```

### Issue: EKS cluster creation timeout

EKS cluster creation can take 15-20 minutes. If it times out, run `terraform apply` again.

### Issue: kubectl connection refused

Ensure your kubeconfig is updated:

```bash
aws eks update-kubeconfig --region us-east-1 --name aws-devops-three-tier-eks
```

### Issue: Insufficient IAM permissions

Ensure your AWS user/role has the following permissions:
- EC2 (VPC, Subnets, Security Groups, NAT Gateways)
- EKS (Cluster, Node Groups)
- ECR (Repositories)
- IAM (Roles, Policies)
- CloudWatch (Logs)

## Security Considerations

- EKS cluster endpoint is publicly accessible but secured with IAM authentication
- Worker nodes are in private subnets with no direct internet access
- NAT Gateways provide outbound internet access for nodes
- Security groups restrict traffic between components
- ECR repositories have encryption enabled
- Terraform state is encrypted in S3

## Next Steps

After infrastructure is provisioned:

1. Deploy Kubernetes manifests for applications
2. Set up Prometheus and Grafana for monitoring
3. Configure GitHub Actions for CI/CD
4. Deploy the three-tier application

## Support

For issues or questions, please refer to:
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Amazon EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
