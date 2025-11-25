output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "eks_cluster_id" {
  description = "ID of the EKS cluster"
  value       = module.eks.cluster_id
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster API server"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_cluster_ca_certificate" {
  description = "Base64 encoded certificate data for cluster"
  value       = module.eks.cluster_ca_certificate
  sensitive   = true
}

output "eks_node_group_id" {
  description = "ID of the EKS node group"
  value       = module.eks.node_group_id
}

output "ecr_repository_urls" {
  description = "URLs of ECR repositories"
  value       = module.ecr.repository_urls
}

output "ecr_repository_arns" {
  description = "ARNs of ECR repositories"
  value       = module.ecr.repository_arns
}

output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "kubeconfig" {
  description = "Kubeconfig data for EKS cluster"
  value = {
    cluster_name              = module.eks.cluster_name
    cluster_endpoint          = module.eks.cluster_endpoint
    cluster_ca_certificate    = module.eks.cluster_ca_certificate
    region                    = var.aws_region
    cluster_security_group_id = module.eks.cluster_security_group_id
  }
  sensitive = true
}

output "configure_kubectl" {
  description = "Instructions to configure kubectl"
  value       = <<-EOT
    Run the following command to configure kubectl:
    
    aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}
    
    Then verify the connection:
    kubectl get nodes
  EOT
}
