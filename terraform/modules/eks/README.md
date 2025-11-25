# EKS Module

This module creates an Amazon Elastic Kubernetes Service (EKS) cluster with managed node groups, IAM roles, and all necessary configurations for running containerized applications.

## Features

- EKS cluster with configurable Kubernetes version
- Managed node groups with auto-scaling
- IAM roles and policies for cluster and nodes
- Security groups for cluster communication
- CloudWatch logging for cluster operations
- Public and private endpoint access
- OIDC provider for IAM roles for service accounts (IRSA)

## Architecture

```
EKS Cluster
├── Control Plane (AWS Managed)
│   ├── API Server
│   ├── etcd
│   └── Controller Manager
├── Managed Node Group
│   ├── Worker Node 1 (Private Subnet AZ1)
│   ├── Worker Node 2 (Private Subnet AZ2)
│   └── Auto Scaling Group (2-5 nodes)
├── IAM Roles
│   ├── Cluster Role
│   └── Node Role
└── Security Groups
    ├── Cluster Security Group
    └── Node Security Group
```

## Usage

```hcl
module "eks" {
  source = "./modules/eks"

  cluster_name    = "my-eks-cluster"
  cluster_version = "1.28"
  
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  
  node_instance_types = ["t3.medium"]
  node_desired_size   = 2
  node_min_size       = 2
  node_max_size       = 5
  
  environment = "dev"
  
  tags = {
    Project = "ecommerce"
  }
}
```

## Input Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `cluster_name` | Name of the EKS cluster | `string` | - | yes |
| `cluster_version` | Kubernetes version | `string` | `"1.28"` | no |
| `vpc_id` | ID of the VPC | `string` | - | yes |
| `private_subnet_ids` | List of private subnet IDs for nodes | `list(string)` | - | yes |
| `node_instance_types` | List of instance types for nodes | `list(string)` | `["t3.medium"]` | no |
| `node_desired_size` | Desired number of nodes | `number` | `2` | no |
| `node_min_size` | Minimum number of nodes | `number` | `2` | no |
| `node_max_size` | Maximum number of nodes | `number` | `5` | no |
| `node_disk_size` | Disk size for nodes (GB) | `number` | `20` | no |
| `enable_cluster_logging` | Enable CloudWatch logging | `bool` | `true` | no |
| `cluster_log_types` | Types of logs to enable | `list(string)` | `["api", "audit", "authenticator", "controllerManager", "scheduler"]` | no |
| `endpoint_private_access` | Enable private API endpoint | `bool` | `true` | no |
| `endpoint_public_access` | Enable public API endpoint | `bool` | `true` | no |
| `environment` | Environment name | `string` | `"dev"` | no |
| `tags` | Additional tags | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `cluster_id` | ID of the EKS cluster |
| `cluster_name` | Name of the EKS cluster |
| `cluster_endpoint` | Endpoint for EKS API server |
| `cluster_version` | Kubernetes version of the cluster |
| `cluster_security_group_id` | Security group ID for the cluster |
| `node_security_group_id` | Security group ID for nodes |
| `cluster_iam_role_arn` | ARN of the cluster IAM role |
| `node_iam_role_arn` | ARN of the node IAM role |
| `cluster_certificate_authority_data` | Certificate authority data for cluster |
| `oidc_provider_arn` | ARN of the OIDC provider |
| `kubeconfig` | kubectl configuration |

## Resources Created

### EKS Cluster
- 1 EKS cluster with specified Kubernetes version
- Control plane in AWS-managed VPC
- API server endpoint (public and/or private)
- CloudWatch log groups for cluster logs

### Managed Node Group
- 1 managed node group
- Auto Scaling Group with configurable size
- Launch template with specified instance type
- Nodes distributed across multiple AZs
- Automatic updates and patching

### IAM Roles

**Cluster Role:**
- Attached policies:
  - `AmazonEKSClusterPolicy`
  - `AmazonEKSVPCResourceController`

**Node Role:**
- Attached policies:
  - `AmazonEKSWorkerNodePolicy`
  - `AmazonEKS_CNI_Policy`
  - `AmazonEC2ContainerRegistryReadOnly`
  - `AmazonSSMManagedInstanceCore` (for Systems Manager)

### Security Groups

**Cluster Security Group:**
- Allows communication between control plane and nodes
- Ingress from nodes on port 443
- Egress to nodes on ports 1025-65535

**Node Security Group:**
- Allows communication between nodes
- Ingress from cluster security group
- Ingress from other nodes (all ports)
- Egress to internet (for pulling images)

### OIDC Provider
- Enables IAM roles for service accounts (IRSA)
- Allows pods to assume IAM roles
- Required for AWS service integration

## Node Group Configuration

### Instance Types

Recommended instance types:

| Type | vCPU | Memory | Use Case | Cost/month |
|------|------|--------|----------|------------|
| `t3.small` | 2 | 2 GB | Development | ~$15 |
| `t3.medium` | 2 | 4 GB | Small workloads | ~$30 |
| `t3.large` | 2 | 8 GB | Medium workloads | ~$60 |
| `m5.large` | 2 | 8 GB | Production | ~$70 |
| `m5.xlarge` | 4 | 16 GB | Large workloads | ~$140 |

### Scaling Configuration

```hcl
node_desired_size = 2  # Initial number of nodes
node_min_size     = 2  # Minimum for high availability
node_max_size     = 5  # Maximum for cost control
```

### Disk Size

```hcl
node_disk_size = 20  # GB, increase for image-heavy workloads
```

## CloudWatch Logging

Enable comprehensive logging for troubleshooting:

```hcl
enable_cluster_logging = true
cluster_log_types = [
  "api",                # API server logs
  "audit",              # Audit logs
  "authenticator",      # Authenticator logs
  "controllerManager",  # Controller manager logs
  "scheduler"           # Scheduler logs
]
```

**Log Retention**: 7 days (configurable)

**Cost**: ~$0.50/GB ingested + $0.03/GB stored

## Endpoint Access

### Public + Private (Recommended)

```hcl
endpoint_public_access  = true
endpoint_private_access = true
```

- API accessible from internet (with IAM auth)
- Nodes communicate via private endpoint
- Best for most use cases

### Private Only

```hcl
endpoint_public_access  = false
endpoint_private_access = true
```

- API only accessible from VPC
- Requires VPN or bastion host
- Most secure option

### Public Only

```hcl
endpoint_public_access  = true
endpoint_private_access = false
```

- All traffic goes through public endpoint
- Not recommended for production

## IAM Roles for Service Accounts (IRSA)

IRSA allows Kubernetes pods to assume IAM roles:

### Example: S3 Access for Pods

```hcl
# Create IAM role for service account
resource "aws_iam_role" "s3_access" {
  name = "eks-pod-s3-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = module.eks.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(module.eks.oidc_provider_arn, "/^(.*provider/)/", "")}:sub": "system:serviceaccount:default:my-service-account"
        }
      }
    }]
  })
}

# Attach S3 policy
resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.s3_access.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
```

### Kubernetes Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/eks-pod-s3-access
```

## Cost Considerations

### Monthly Costs (us-east-1)

- **EKS Cluster**: $73/month (fixed)
- **EC2 Instances**: 
  - 2× t3.medium: ~$60/month
  - 2× t3.large: ~$120/month
  - 2× m5.large: ~$140/month
- **EBS Volumes**: ~$2/month per 20GB volume
- **Data Transfer**: Variable
- **CloudWatch Logs**: ~$0.50/GB

**Total**: ~$135-215/month (2 nodes)

### Cost Optimization

1. **Use Spot Instances**: Save up to 90%
   ```hcl
   capacity_type = "SPOT"
   ```

2. **Right-size instances**: Start small, scale up as needed

3. **Use Cluster Autoscaler**: Scale nodes based on demand

4. **Enable Container Insights**: Monitor resource usage

## High Availability

### Multi-AZ Deployment

Nodes are automatically distributed across availability zones:

```hcl
private_subnet_ids = [
  "subnet-xxx",  # us-east-1a
  "subnet-yyy",  # us-east-1b
]
```

### Minimum Nodes

Set minimum to 2 for high availability:

```hcl
node_min_size = 2
```

### Pod Disruption Budgets

Configure in Kubernetes:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: my-app
```

## Security Best Practices

1. **Private Subnets**: Deploy nodes in private subnets only
2. **Security Groups**: Restrict access to necessary ports
3. **IAM Roles**: Use IRSA instead of instance profiles
4. **Network Policies**: Implement Kubernetes network policies
5. **Secrets Encryption**: Enable envelope encryption for secrets
6. **Pod Security**: Use Pod Security Standards
7. **Image Scanning**: Scan images for vulnerabilities

## Accessing the Cluster

### Configure kubectl

```bash
aws eks update-kubeconfig --region us-east-1 --name my-eks-cluster
```

### Verify Access

```bash
kubectl get nodes
kubectl get pods --all-namespaces
```

### Grant Additional Users Access

Edit aws-auth ConfigMap:

```bash
kubectl edit configmap aws-auth -n kube-system
```

Add users:

```yaml
mapUsers: |
  - userarn: arn:aws:iam::ACCOUNT_ID:user/username
    username: username
    groups:
      - system:masters
```

## Upgrading the Cluster

### 1. Upgrade Control Plane

```hcl
cluster_version = "1.29"  # Update version
```

```bash
terraform apply
```

### 2. Upgrade Node Group

```bash
# Update node group to new Kubernetes version
aws eks update-nodegroup-version \
  --cluster-name my-eks-cluster \
  --nodegroup-name my-node-group \
  --kubernetes-version 1.29
```

### 3. Update Add-ons

```bash
# Update VPC CNI
kubectl set image daemonset aws-node \
  -n kube-system \
  aws-node=602401143452.dkr.ecr.us-east-1.amazonaws.com/amazon-k8s-cni:v1.15.0

# Update kube-proxy
kubectl set image daemonset kube-proxy \
  -n kube-system \
  kube-proxy=602401143452.dkr.ecr.us-east-1.amazonaws.com/eks/kube-proxy:v1.29.0
```

## Troubleshooting

### Issue: Nodes not joining cluster

**Check:**
1. Node IAM role has required policies
2. Security groups allow communication
3. Nodes can reach EKS API endpoint

```bash
# Check node status
kubectl get nodes

# Check node logs
aws ec2 describe-instances --filters "Name=tag:eks:cluster-name,Values=my-eks-cluster"
```

### Issue: Pods can't pull images from ECR

**Solution**: Ensure node IAM role has `AmazonEC2ContainerRegistryReadOnly` policy

```bash
aws iam list-attached-role-policies --role-name eks-node-role
```

### Issue: kubectl connection refused

**Solution**: Update kubeconfig

```bash
aws eks update-kubeconfig --region us-east-1 --name my-eks-cluster
```

### Issue: Insufficient capacity

**Solution**: Increase max nodes or use different instance types

```hcl
node_max_size = 10
node_instance_types = ["t3.medium", "t3.large"]
```

## Examples

### Development Cluster

```hcl
module "eks" {
  source = "./modules/eks"

  cluster_name    = "dev-cluster"
  cluster_version = "1.28"
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  node_instance_types = ["t3.small"]
  node_desired_size   = 1
  node_min_size       = 1
  node_max_size       = 2
  
  environment = "dev"
}
```

### Production Cluster

```hcl
module "eks" {
  source = "./modules/eks"

  cluster_name    = "prod-cluster"
  cluster_version = "1.28"
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  node_instance_types = ["m5.large", "m5.xlarge"]
  node_desired_size   = 3
  node_min_size       = 3
  node_max_size       = 10
  node_disk_size      = 50
  
  enable_cluster_logging = true
  endpoint_public_access = false
  endpoint_private_access = true
  
  environment = "production"
  
  tags = {
    CostCenter = "engineering"
    Compliance = "pci-dss"
  }
}
```

## References

- [Amazon EKS Documentation](https://docs.aws.amazon.com/eks/)
- [EKS Best Practices Guide](https://aws.github.io/aws-eks-best-practices/)
- [Terraform AWS EKS Module](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
