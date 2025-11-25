# Security Groups Module

This module creates and manages security groups for EKS cluster components, controlling network traffic between the control plane, worker nodes, and application load balancers.

## Features

- Security group for EKS cluster control plane
- Security group for EKS worker nodes
- Security group for application load balancers
- Ingress and egress rules for secure communication
- Support for additional custom rules
- Proper tagging for resource management

## Architecture

```
┌─────────────────────┐
│   Load Balancer SG  │
│   (Port 80, 443)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Cluster SG       │
│   (Port 443)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     Node SG         │
│  (All ports)        │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│    Database SG      │
│   (Port 5432)       │
└─────────────────────┘
```

## Usage

```hcl
module "security_groups" {
  source = "./modules/security_groups"

  vpc_id       = module.vpc.vpc_id
  cluster_name = "my-eks-cluster"
  environment  = "dev"
  
  cluster_security_group_id = module.eks.cluster_security_group_id
  node_security_group_id    = module.eks.node_security_group_id
  
  allowed_cidr_blocks = ["10.0.0.0/16"]
  
  tags = {
    Project = "ecommerce"
  }
}
```

## Input Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `vpc_id` | ID of the VPC | `string` | - | yes |
| `cluster_name` | Name of the EKS cluster | `string` | - | yes |
| `environment` | Environment name | `string` | `"dev"` | no |
| `cluster_security_group_id` | Security group ID of EKS cluster | `string` | - | yes |
| `node_security_group_id` | Security group ID of EKS nodes | `string` | - | yes |
| `allowed_cidr_blocks` | CIDR blocks allowed to access cluster | `list(string)` | `[]` | no |
| `enable_alb_security_group` | Create security group for ALB | `bool` | `true` | no |
| `enable_database_security_group` | Create security group for database | `bool` | `true` | no |
| `additional_cluster_rules` | Additional rules for cluster SG | `list(object)` | `[]` | no |
| `additional_node_rules` | Additional rules for node SG | `list(object)` | `[]` | no |
| `tags` | Additional tags | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `cluster_security_group_id` | ID of the cluster security group |
| `node_security_group_id` | ID of the node security group |
| `alb_security_group_id` | ID of the ALB security group |
| `database_security_group_id` | ID of the database security group |

## Security Group Rules

### Cluster Security Group

**Ingress Rules:**
- Port 443 from node security group (API server access)
- Port 443 from allowed CIDR blocks (external access)

**Egress Rules:**
- All traffic to node security group
- All traffic to internet (for AWS API calls)

### Node Security Group

**Ingress Rules:**
- All traffic from cluster security group
- All traffic from other nodes (inter-node communication)
- Port 443 from ALB security group (for ingress controller)
- Ports 1025-65535 from cluster security group (kubelet API)

**Egress Rules:**
- All traffic to internet (for pulling images, updates)
- All traffic to cluster security group

### ALB Security Group

**Ingress Rules:**
- Port 80 from 0.0.0.0/0 (HTTP traffic)
- Port 443 from 0.0.0.0/0 (HTTPS traffic)

**Egress Rules:**
- All traffic to node security group

### Database Security Group

**Ingress Rules:**
- Port 5432 from node security group (PostgreSQL)

**Egress Rules:**
- None (database doesn't initiate outbound connections)

## Security Best Practices

### 1. Principle of Least Privilege

Only allow necessary traffic:

```hcl
# Bad: Allow all traffic
ingress {
  from_port   = 0
  to_port     = 65535
  protocol    = "-1"
  cidr_blocks = ["0.0.0.0/0"]
}

# Good: Allow specific ports
ingress {
  from_port   = 443
  to_port     = 443
  protocol    = "tcp"
  cidr_blocks = ["10.0.0.0/16"]
}
```

### 2. Use Security Group References

Reference security groups instead of CIDR blocks:

```hcl
# Good: Reference security group
ingress {
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.node.id
}
```

### 3. Restrict Database Access

Only allow application tier to access database:

```hcl
resource "aws_security_group_rule" "database_from_backend" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.node.id
  security_group_id        = aws_security_group.database.id
}
```

### 4. Enable VPC Flow Logs

Monitor network traffic:

```hcl
resource "aws_flow_log" "vpc" {
  vpc_id          = var.vpc_id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
}
```

## Common Patterns

### Allow SSH Access (Development Only)

```hcl
resource "aws_security_group_rule" "node_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]  # VPC CIDR only
  security_group_id = var.node_security_group_id
}
```

### Allow Prometheus Scraping

```hcl
resource "aws_security_group_rule" "node_prometheus" {
  type                     = "ingress"
  from_port                = 9090
  to_port                  = 9090
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.monitoring.id
  security_group_id        = var.node_security_group_id
}
```

### Allow Redis Access

```hcl
resource "aws_security_group" "redis" {
  name        = "${var.cluster_name}-redis"
  description = "Security group for Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port                = 6379
    to_port                  = 6379
    protocol                 = "tcp"
    source_security_group_id = var.node_security_group_id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_name}-redis"
    }
  )
}
```

## Troubleshooting

### Issue: Pods can't reach API server

**Check:**
1. Node security group allows egress to cluster security group
2. Cluster security group allows ingress from node security group

```bash
# Verify security group rules
aws ec2 describe-security-groups --group-ids sg-xxx

# Test connectivity from node
kubectl exec -it <pod-name> -- curl -k https://kubernetes.default.svc
```

### Issue: Load balancer can't reach pods

**Check:**
1. ALB security group allows egress to node security group
2. Node security group allows ingress from ALB security group

```bash
# Check ALB target health
aws elbv2 describe-target-health --target-group-arn <arn>
```

### Issue: Pods can't communicate with each other

**Check:**
1. Node security group allows ingress from itself
2. Network policies aren't blocking traffic

```bash
# Test pod-to-pod connectivity
kubectl exec -it <pod-1> -- ping <pod-2-ip>
```

### Issue: Database connection timeout

**Check:**
1. Database security group allows ingress from node security group
2. Database is in correct subnets
3. Network ACLs aren't blocking traffic

```bash
# Test database connectivity from pod
kubectl exec -it <backend-pod> -- nc -zv postgres 5432
```

## Examples

### Development Environment

```hcl
module "security_groups" {
  source = "./modules/security_groups"

  vpc_id       = module.vpc.vpc_id
  cluster_name = "dev-cluster"
  environment  = "dev"
  
  cluster_security_group_id = module.eks.cluster_security_group_id
  node_security_group_id    = module.eks.node_security_group_id
  
  # Allow SSH from VPC
  allowed_cidr_blocks = ["10.0.0.0/16"]
  
  # Enable all security groups
  enable_alb_security_group      = true
  enable_database_security_group = true
}
```

### Production Environment

```hcl
module "security_groups" {
  source = "./modules/security_groups"

  vpc_id       = module.vpc.vpc_id
  cluster_name = "prod-cluster"
  environment  = "production"
  
  cluster_security_group_id = module.eks.cluster_security_group_id
  node_security_group_id    = module.eks.node_security_group_id
  
  # Restrict API access to VPN
  allowed_cidr_blocks = ["10.0.0.0/16"]
  
  enable_alb_security_group      = true
  enable_database_security_group = true
  
  tags = {
    Compliance = "pci-dss"
    Backup     = "required"
  }
}
```

### With Additional Rules

```hcl
module "security_groups" {
  source = "./modules/security_groups"

  vpc_id       = module.vpc.vpc_id
  cluster_name = "my-cluster"
  
  cluster_security_group_id = module.eks.cluster_security_group_id
  node_security_group_id    = module.eks.node_security_group_id
  
  # Add custom rules for monitoring
  additional_node_rules = [
    {
      type        = "ingress"
      from_port   = 9090
      to_port     = 9090
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/16"]
      description = "Prometheus metrics"
    },
    {
      type        = "ingress"
      from_port   = 9100
      to_port     = 9100
      protocol    = "tcp"
      cidr_blocks = ["10.0.0.0/16"]
      description = "Node exporter"
    }
  ]
}
```

## Security Group Limits

### AWS Limits (per region)

- Security groups per VPC: 2,500 (default: 500)
- Rules per security group: 60 (inbound + outbound)
- Security groups per network interface: 5

### Best Practices

1. **Consolidate Rules**: Use CIDR ranges instead of individual IPs
2. **Use References**: Reference security groups instead of IPs
3. **Monitor Usage**: Track security group count
4. **Request Increases**: If approaching limits

## Monitoring

### CloudWatch Metrics

Monitor security group changes:

```hcl
resource "aws_cloudwatch_event_rule" "security_group_changes" {
  name        = "security-group-changes"
  description = "Capture security group changes"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventName = [
        "AuthorizeSecurityGroupIngress",
        "AuthorizeSecurityGroupEgress",
        "RevokeSecurityGroupIngress",
        "RevokeSecurityGroupEgress"
      ]
    }
  })
}
```

### Audit Security Groups

```bash
# List all security groups
aws ec2 describe-security-groups

# Find unused security groups
aws ec2 describe-security-groups \
  --query 'SecurityGroups[?length(IpPermissions)==`0` && length(IpPermissionsEgress)==`1`]'

# Check security group rules
aws ec2 describe-security-group-rules \
  --filters Name=group-id,Values=sg-xxx
```

## Compliance

### PCI-DSS Requirements

- Restrict inbound traffic to necessary ports
- Document all security group rules
- Review rules quarterly
- Log all changes to security groups

### HIPAA Requirements

- Encrypt data in transit (use TLS)
- Restrict access to minimum necessary
- Audit all network access
- Implement network segmentation

## References

- [AWS Security Groups Documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
- [EKS Security Best Practices](https://aws.github.io/aws-eks-best-practices/security/docs/)
- [VPC Security](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Security.html)
- [Network ACLs vs Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Security.html#VPC_Security_Comparison)
