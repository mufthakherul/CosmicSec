variable "environment" { type = string }

data "aws_subnets" "default" {
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

resource "aws_iam_role" "eks_cluster" {
  name = "cosmicsec-eks-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_eks_cluster" "cosmicsec" {
  name     = "cosmicsec-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids = data.aws_subnets.default.ids
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]

  tags = {
    Name        = "cosmicsec-eks-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "cluster_endpoint" {
  value     = aws_eks_cluster.cosmicsec.endpoint
  sensitive = true
}
