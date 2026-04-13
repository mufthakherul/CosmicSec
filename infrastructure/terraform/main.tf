terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "prod"
}

variable "postgres_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis auth token"
  type        = string
  sensitive   = true
}

provider "aws" {
  region = var.region
}

module "postgres" {
  source            = "./modules/postgres"
  environment       = var.environment
  postgres_password = var.postgres_password
}

module "redis" {
  source         = "./modules/redis"
  environment    = var.environment
  redis_password = var.redis_password
}

module "k8s" {
  source      = "./modules/k8s"
  environment = var.environment
}

output "postgres_endpoint" {
  value = module.postgres.endpoint
}

output "redis_endpoint" {
  value = module.redis.endpoint
}

output "k8s_cluster_endpoint" {
  value     = module.k8s.cluster_endpoint
  sensitive = true
}
