# Additional security group rules for node-to-node communication
resource "aws_security_group_rule" "node_ingress_https" {
  description              = "Allow HTTPS traffic between nodes"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  security_group_id        = var.node_security_group_id
  source_security_group_id = var.node_security_group_id
  type                     = "ingress"
}

# Allow nodes to communicate on ephemeral ports
resource "aws_security_group_rule" "node_ingress_ephemeral" {
  description              = "Allow nodes to communicate on ephemeral ports"
  from_port                = 1025
  to_port                  = 65535
  protocol                 = "tcp"
  security_group_id        = var.node_security_group_id
  source_security_group_id = var.node_security_group_id
  type                     = "ingress"
}

# Allow cluster to communicate with nodes on kubelet port
resource "aws_security_group_rule" "cluster_to_node_kubelet" {
  description              = "Allow cluster to communicate with nodes on kubelet port"
  from_port                = 10250
  to_port                  = 10250
  protocol                 = "tcp"
  security_group_id        = var.node_security_group_id
  source_security_group_id = var.cluster_security_group_id
  type                     = "ingress"
}

# Allow cluster to communicate with nodes on CoreDNS port
resource "aws_security_group_rule" "cluster_to_node_coredns_tcp" {
  description              = "Allow cluster to communicate with nodes on CoreDNS TCP port"
  from_port                = 53
  to_port                  = 53
  protocol                 = "tcp"
  security_group_id        = var.node_security_group_id
  source_security_group_id = var.cluster_security_group_id
  type                     = "ingress"
}

resource "aws_security_group_rule" "cluster_to_node_coredns_udp" {
  description              = "Allow cluster to communicate with nodes on CoreDNS UDP port"
  from_port                = 53
  to_port                  = 53
  protocol                 = "udp"
  security_group_id        = var.node_security_group_id
  source_security_group_id = var.cluster_security_group_id
  type                     = "ingress"
}
