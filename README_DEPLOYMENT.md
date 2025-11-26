# AWS DevOps Three-Tier Application - Quick Start

## 🚀 Deploy Everything with One Command

```bash
./deploy.sh
```

That's it! The script will automatically:
- ✅ Deploy AWS infrastructure (VPC, EKS, ECR)
- ✅ Build and push Docker images
- ✅ Deploy database, backend, and monitoring
- ✅ Configure everything for you

## Prerequisites

Install these tools first:
```bash
# macOS
brew install terraform awscli kubectl docker

# Configure AWS
aws configure
```

## What Gets Deployed

### Infrastructure (Terraform)
- VPC with public/private subnets across 2 AZs
- EKS cluster with 2 worker nodes (t3.medium)
- ECR repositories for Docker images
- NAT Gateways, Internet Gateway, Security Groups

### Applications (Kubernetes)
- **PostgreSQL Database** (with 20GB persistent storage)
- **Backend API** (Node.js/Express with 2 replicas)
- **Prometheus** (metrics collection)
- **Grafana** (dashboards and visualization)

## Access Your Application

After deployment completes, you'll see:

```
Backend API: http://<loadbalancer-url>:3000
  - Health: http://<loadbalancer-url>:3000/api/health
  - Products: http://<loadbalancer-url>:3000/api/products

Prometheus: http://<prometheus-url>:9090

Grafana: kubectl port-forward -n monitoring svc/grafana-service 3000:80
  Then open: http://localhost:3000
  Username: admin
  Password: changeme_grafana_password
```

## Cleanup

To remove everything:
```bash
cd terraform
terraform destroy -auto-approve
```

## Estimated Cost

~$228/month for running this infrastructure 24/7 in us-east-1

## Need Help?

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions and troubleshooting.
