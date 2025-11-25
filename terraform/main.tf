module "vpc" {
  source = "./modules/vpc"

  cluster_name         = var.cluster_name
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  environment          = var.environment
}

module "eks" {
  source = "./modules/eks"

  cluster_name            = var.cluster_name
  cluster_version         = var.cluster_version
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  node_instance_type      = var.node_instance_type
  node_group_min_size     = var.node_group_min_size
  node_group_desired_size = var.node_group_desired_size
  node_group_max_size     = var.node_group_max_size
  enable_cluster_logging  = var.enable_cluster_logging
  environment             = var.environment
}

module "ecr" {
  source = "./modules/ecr"

  repository_names      = var.ecr_repositories
  image_retention_count = var.ecr_image_retention_count
  environment           = var.environment
}

module "security_groups" {
  source = "./modules/security_groups"

  vpc_id                    = module.vpc.vpc_id
  cluster_security_group_id = module.eks.cluster_security_group_id
  node_security_group_id    = module.eks.node_security_group_id
  environment               = var.environment
}
