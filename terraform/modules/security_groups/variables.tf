variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "cluster_security_group_id" {
  description = "Security group ID of the EKS cluster"
  type        = string
}

variable "node_security_group_id" {
  description = "Security group ID of the EKS nodes"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}
