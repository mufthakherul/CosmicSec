variable "environment" { type = string }
variable "postgres_password" {
  type      = string
  sensitive = true
}

resource "aws_db_instance" "cosmicsec" {
  identifier              = "cosmicsec-${var.environment}"
  engine                  = "postgres"
  engine_version          = "16.1"
  instance_class          = "db.t3.medium"
  allocated_storage       = 100
  storage_type            = "gp3"
  storage_encrypted       = true
  db_name                 = "cosmicsec"
  username                = "cosmicsec"
  password                = var.postgres_password
  parameter_group_name    = "default.postgres16"
  publicly_accessible     = false
  deletion_protection     = true
  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "cosmicsec-${var.environment}-final"

  tags = {
    Name        = "cosmicsec-postgres-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "endpoint" {
  value = aws_db_instance.cosmicsec.endpoint
}
