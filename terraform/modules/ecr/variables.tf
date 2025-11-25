variable "repository_names" {
  description = "List of ECR repository names to create"
  type        = list(string)
}

variable "image_retention_count" {
  description = "Number of images to retain in ECR repositories"
  type        = number
}

variable "environment" {
  description = "Environment name"
  type        = string
}
