# VPC Module

This module creates a Virtual Private Cloud (VPC) with public and private subnets across multiple availability zones, along with all necessary networking components for an EKS cluster.

## Features

- VPC with customizable CIDR block
- Public subnets for load balancers and NAT gateways
- Private subnets for EKS worker nodes
- Internet Gateway for public subnet internet access
- NAT Gateways for private subnet outbound internet access
- Route tables for public and private subnets
- Proper tagging for EKS cluster discovery

## Architecture

```
VPC (10.0.0.0/16)
├── Public Subnet AZ1 (10.0.1.0/24)
│   ├── Internet Gateway
│   └── NAT Gateway 1
├── Public Subnet AZ2 (10.0.2.0/24)
│   └── NAT Gateway 2
├── Private Subnet AZ1 (10.0.10.0/24)
│   └── Routes through NAT Gateway 1
└── Private Subnet AZ2 (10.0.20.0/24)
    └── Routes through NAT Gateway 2
```

## Usage

```hcl
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr            = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
  availability_zones  = ["us-east-1a", "us-east-1b"]
  cluster_name        = "my-eks-cluster"
  environment         = "dev"
  
  tags = {
    Project = "ecommerce"
    ManagedBy = "terraform"
  }
}
```

## Input Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `vpc_cidr` | CIDR block for VPC | `string` | `"10.0.0.0/16"` | no |
| `public_subnet_cidrs` | List of CIDR blocks for public subnets | `list(string)` | - | yes |
| `private_subnet_cidrs` | List of CIDR blocks for private subnets | `list(string)` | - | yes |
| `availability_zones` | List of availability zones | `list(string)` | - | yes |
| `cluster_name` | Name of the EKS cluster | `string` | - | yes |
| `environment` | Environment name (dev, staging, prod) | `string` | `"dev"` | no |
| `tags` | Additional tags for resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `vpc_id` | ID of the VPC |
| `vpc_cidr` | CIDR block of the VPC |
| `public_subnet_ids` | List of public subnet IDs |
| `private_subnet_ids` | List of private subnet IDs |
| `nat_gateway_ids` | List of NAT Gateway IDs |
| `internet_gateway_id` | ID of the Internet Gateway |
| `public_route_table_id` | ID of the public route table |
| `private_route_table_ids` | List of private route table IDs |

## Resources Created

### VPC
- 1 VPC with DNS support and hostnames enabled
- CIDR block: Configurable (default: 10.0.0.0/16)

### Subnets
- 2 Public subnets (one per AZ)
- 2 Private subnets (one per AZ)
- Auto-assign public IPs in public subnets

### Gateways
- 1 Internet Gateway attached to VPC
- 2 NAT Gateways (one per public subnet for high availability)
- 2 Elastic IPs for NAT Gateways

### Route Tables
- 1 Public route table (routes to Internet Gateway)
- 2 Private route tables (routes to respective NAT Gateways)

### Tags
All resources are tagged with:
- `Name`: Descriptive name
- `Environment`: Environment identifier
- `ManagedBy`: "terraform"
- `kubernetes.io/cluster/<cluster-name>`: "shared" (for EKS discovery)

## EKS-Specific Tags

The module automatically adds tags required for EKS:

**Public Subnets:**
```hcl
"kubernetes.io/role/elb" = "1"
"kubernetes.io/cluster/${var.cluster_name}" = "shared"
```

**Private Subnets:**
```hcl
"kubernetes.io/role/internal-elb" = "1"
"kubernetes.io/cluster/${var.cluster_name}" = "shared"
```

These tags enable:
- Automatic subnet discovery by EKS
- Proper load balancer placement
- Internal vs external load balancer routing

## Cost Considerations

### Monthly Costs (us-east-1)

- **NAT Gateways**: ~$32.40/month each × 2 = ~$64.80/month
- **Elastic IPs**: $0/month (when attached to NAT Gateways)
- **Data Transfer**: $0.045/GB (first 10 TB)

**Total**: ~$65-100/month depending on data transfer

### Cost Optimization

1. **Single NAT Gateway**: Use one NAT Gateway instead of two (reduces HA)
   ```hcl
   # Modify to use single NAT Gateway
   count = 1  # Instead of length(var.public_subnet_cidrs)
   ```

2. **NAT Instances**: Replace NAT Gateways with NAT instances (more management)

3. **VPC Endpoints**: Add VPC endpoints for AWS services to reduce data transfer

## High Availability

This module creates resources across multiple availability zones:

- **2 Public Subnets**: One in each AZ
- **2 Private Subnets**: One in each AZ
- **2 NAT Gateways**: One in each public subnet

This ensures:
- If one AZ fails, resources in the other AZ continue operating
- EKS nodes are distributed across AZs
- Load balancers can route to multiple AZs

## Security

### Network Isolation
- Private subnets have no direct internet access
- All outbound traffic from private subnets goes through NAT Gateways
- Public subnets only for load balancers and NAT Gateways

### Best Practices
- Enable VPC Flow Logs for network monitoring
- Use Network ACLs for additional security layer
- Implement security groups at instance level

## Examples

### Minimal Configuration

```hcl
module "vpc" {
  source = "./modules/vpc"

  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
  availability_zones   = ["us-east-1a", "us-east-1b"]
  cluster_name         = "my-cluster"
}
```

### Production Configuration

```hcl
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
  availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
  cluster_name         = "prod-eks-cluster"
  environment          = "production"
  
  tags = {
    Project     = "ecommerce"
    Team        = "platform"
    CostCenter  = "engineering"
    ManagedBy   = "terraform"
  }
}
```

## Troubleshooting

### Issue: NAT Gateway creation fails

**Cause**: Elastic IP limit reached

**Solution**: Request limit increase or delete unused Elastic IPs

```bash
aws ec2 describe-addresses
aws ec2 release-address --allocation-id <eip-id>
```

### Issue: Subnet CIDR conflicts

**Cause**: CIDR blocks overlap with existing VPCs

**Solution**: Use different CIDR blocks or delete conflicting VPCs

### Issue: EKS can't discover subnets

**Cause**: Missing or incorrect tags

**Solution**: Verify tags are applied correctly:

```bash
aws ec2 describe-subnets --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=shared"
```

## References

- [AWS VPC Documentation](https://docs.aws.amazon.com/vpc/)
- [EKS VPC Requirements](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html)
- [Terraform AWS VPC Module](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/)
