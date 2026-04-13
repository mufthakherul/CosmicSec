variable "environment" { type = string }
variable "redis_password" {
  type      = string
  sensitive = true
}

resource "aws_elasticache_cluster" "cosmicsec" {
  cluster_id           = "cosmicsec-${var.environment}"
  engine               = "redis"
  engine_version       = "7.2"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  tags = {
    Name        = "cosmicsec-redis-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "endpoint" {
  value = aws_elasticache_cluster.cosmicsec.cache_nodes[0].address
}
