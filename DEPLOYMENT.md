# AWS DevOps Three-Tier Application - Deployment Guide

This guide walks you through deploying the complete three-tier e-commerce application to AWS using Terraform, Docker, and Kubernetes.

## 🎯 Overview

This deployment includes:
- **Infrastructure**: VPC, EKS Cluster, ECR Repositories (via Terraform)
- **Applications**: React Frontend, Node.js Backend, PostgreSQL Database
- **Monitoring**: Prometheus & Grafana
- **CI/CD**: GitHub Actions automated pipeline

## 📋 Prerequisites

Before starting, ensure you have:

1. **AWS Account** with administrator access
2. **AWS CLI** installed and configured
3. **Terraform** >= 1.5.0 installed
4. **kubectl** >= 1.28 installed
5. **Docker** installed (for local testing)
6. **Git** installed
7. **GitHub Account** with this repository

### Install Prerequisites (macOS)

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install AWS CLI
brew install awscli

# Install Terraform
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Install kubectl
brew install kubectl

# Install Docker Desktop
brew install --cask docker

# Verify installations
aws --version
terraform --version
kubectl version --client
docker --version
```

## 🚀 Deployment Steps

### Step 1: Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# You'll be prompted for:
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### Step 2: Create Terraform Backend (First Time Only)

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket terraform-state-aws-devops-$(date +%s) \
  --region us-east-1

# Note the bucket name and update it in terraform/providers.tf

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket <your-bucket-name> \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket <your-bucket-name> \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 3: Deploy Infrastructure with Terraform

```bash
# Navigate to terraform directory
cd terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your preferences
# vim terraform.tfvars

# Initialize Terraform
terraform init

# Review the execution plan
terraform plan

# Apply the configuration (takes 15-20 minutes)
terraform apply

# Type 'yes' when prompted
```

**Expected Output:**
```
Apply complete! Resources: 45 added, 0 changed, 0 destroyed.

Outputs:

ecr_repository_urls = {
  "backend" = "123456789.dkr.ecr.us-east-1.amazonaws.com/ecommerce-backend"
  "database" = "123456789.dkr.ecr.us-east-1.amazonaws.com/ecommerce-database"
  "frontend" = "123456789.dkr.ecr.us-east-1.amazonaws.com/ecommerce-frontend"
}
eks_cluster_endpoint = "https://XXXXX.gr7.us-east-1.eks.amazonaws.com"
eks_cluster_name = "ecommerce-cluster"
vpc_id = "vpc-xxxxx"
```

### Step 4: Configure kubectl for EKS

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name ecommerce-cluster

# Verify connection
kubectl get nodes

# You should see 2 nodes in Ready state
```

### Step 5: Set Up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

1. **AWS_ACCESS_KEY_ID**: Your AWS access key
2. **AWS_SECRET_ACCESS_KEY**: Your AWS secret key
3. **AWS_REGION**: `us-east-1` (or your region)
4. **EKS_CLUSTER_NAME**: `ecommerce-cluster` (from Terraform output)

### Step 6: Update Kubernetes Manifests with ECR URLs

Get your ECR repository URLs from Terraform output:

```bash
cd terraform
terraform output ecr_repository_urls
```

Update the image references in Kubernetes manifests:

```bash
cd ../k8s

# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"

# Update frontend deployment
sed -i '' "s|image:.*ecommerce-frontend.*|image: ${ECR_REGISTRY}/ecommerce-frontend:latest|g" 04-frontend.yaml

# Update backend deployment
sed -i '' "s|image:.*ecommerce-backend.*|image: ${ECR_REGISTRY}/ecommerce-backend:latest|g" 03-backend.yaml

# Update database deployment
sed -i '' "s|image:.*ecommerce-database.*|image: ${ECR_REGISTRY}/ecommerce-database:latest|g" 02-database.yaml
```

### Step 7: Build and Push Docker Images Manually (First Time)

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build and push frontend
cd ../frontend
docker build -t ${ECR_REGISTRY}/ecommerce-frontend:latest .
docker push ${ECR_REGISTRY}/ecommerce-frontend:latest

# Build and push backend
cd ../backend
docker build -t ${ECR_REGISTRY}/ecommerce-backend:latest .
docker push ${ECR_REGISTRY}/ecommerce-backend:latest

# Build and push database
cd ../database
docker build -t ${ECR_REGISTRY}/ecommerce-database:latest .
docker push ${ECR_REGISTRY}/ecommerce-database:latest

cd ..
```

### Step 8: Deploy Applications to Kubernetes

```bash
cd k8s

# Apply manifests in order
kubectl apply -f 00-namespaces.yaml
kubectl apply -f 01-secrets.yaml
kubectl apply -f 02-database-configmap.yaml
kubectl apply -f 02-database.yaml
kubectl apply -f 03-backend-configmap.yaml
kubectl apply -f 03-backend.yaml
kubectl apply -f 04-frontend-configmap.yaml
kubectl apply -f 04-frontend.yaml
kubectl apply -f 05-network-policies.yaml
kubectl apply -f 06-hpa.yaml

# Wait for pods to be ready
kubectl get pods -n ecommerce-app -w

# Press Ctrl+C when all pods are Running
```

### Step 9: Deploy Monitoring Stack

```bash
# Deploy Prometheus
kubectl apply -f 07-prometheus-configmap.yaml
kubectl apply -f 08-prometheus-rules.yaml
kubectl apply -f 09-prometheus.yaml

# Deploy Grafana
kubectl apply -f 10-grafana-dashboards.yaml
kubectl apply -f 11-grafana-config.yaml
kubectl apply -f 12-grafana.yaml

# Wait for monitoring pods
kubectl get pods -n monitoring -w
```

### Step 10: Access Your Application

```bash
# Get frontend service URL
kubectl get service frontend -n ecommerce-app

# Get Grafana service URL
kubectl get service grafana -n monitoring

# If using LoadBalancer type, you'll see an external URL
# Example: a1234567890.us-east-1.elb.amazonaws.com
```

**Access the application:**
- Frontend: `http://<frontend-external-ip>`
- Grafana: `http://<grafana-external-ip>:3000`
  - Username: `admin`
  - Password: Check the secret in `k8s/01-secrets.yaml`

### Step 11: Enable CI/CD (Automated Deployments)

Now that everything is set up, future deployments will be automatic:

```bash
# Make a change to your code
echo "// Updated" >> backend/src/app.ts

# Commit and push
git add .
git commit -m "Update backend"
git push origin main

# GitHub Actions will automatically:
# 1. Run tests
# 2. Build Docker images
# 3. Push to ECR
# 4. Deploy to EKS
```

Monitor the workflow:
- Go to GitHub → Actions tab
- Watch the CI/CD pipeline execute

## 🔍 Verification

### Check Application Health

```bash
# Check all pods
kubectl get pods -n ecommerce-app
kubectl get pods -n monitoring

# Check services
kubectl get svc -n ecommerce-app
kubectl get svc -n monitoring

# Check logs
kubectl logs -n ecommerce-app deployment/frontend
kubectl logs -n ecommerce-app deployment/backend
kubectl logs -n ecommerce-app statefulset/postgres

# Test backend API
BACKEND_URL=$(kubectl get svc backend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://${BACKEND_URL}:3000/api/health

# Test frontend
FRONTEND_URL=$(kubectl get svc frontend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://${FRONTEND_URL}
```

### Access Grafana Dashboards

1. Get Grafana URL:
```bash
kubectl get svc grafana -n monitoring
```

2. Open in browser: `http://<grafana-url>:3000`
3. Login with credentials from `k8s/01-secrets.yaml`
4. Navigate to Dashboards → Browse
5. View pre-configured dashboards:
   - Kubernetes Cluster Overview
   - Application Metrics
   - Database Metrics

## 🔧 Troubleshooting

### Pods Not Starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n ecommerce-app

# Check logs
kubectl logs <pod-name> -n ecommerce-app

# Common issues:
# - Image pull errors: Check ECR permissions
# - CrashLoopBackOff: Check application logs
# - Pending: Check node resources
```

### Cannot Access Services

```bash
# Check service endpoints
kubectl get endpoints -n ecommerce-app

# Check if LoadBalancer is provisioned
kubectl get svc -n ecommerce-app

# If EXTERNAL-IP shows <pending>, wait a few minutes
# AWS needs time to provision the load balancer
```

### Database Connection Issues

```bash
# Check database pod
kubectl logs statefulset/postgres -n ecommerce-app

# Check backend can reach database
kubectl exec -it deployment/backend -n ecommerce-app -- sh
# Inside pod:
nc -zv postgres 5432
```

### GitHub Actions Failing

1. Check secrets are set correctly in GitHub
2. Verify AWS credentials have necessary permissions
3. Check workflow logs in GitHub Actions tab
4. Ensure EKS cluster name matches in workflow

## 🧹 Cleanup

To destroy all resources and avoid charges:

```bash
# Delete Kubernetes resources
kubectl delete namespace ecommerce-app
kubectl delete namespace monitoring

# Destroy Terraform infrastructure
cd terraform
terraform destroy

# Type 'yes' when prompted

# Delete ECR images (optional)
aws ecr batch-delete-image \
  --repository-name ecommerce-frontend \
  --image-ids imageTag=latest

aws ecr batch-delete-image \
  --repository-name ecommerce-backend \
  --image-ids imageTag=latest

aws ecr batch-delete-image \
  --repository-name ecommerce-database \
  --image-ids imageTag=latest
```

## 💰 Cost Optimization

To reduce costs:

1. **Use Spot Instances** for EKS nodes
2. **Scale down** when not in use:
   ```bash
   kubectl scale deployment frontend --replicas=0 -n ecommerce-app
   kubectl scale deployment backend --replicas=0 -n ecommerce-app
   ```
3. **Delete NAT Gateways** when not needed (modify Terraform)
4. **Use smaller instance types** (t3.small instead of t3.medium)

## 📚 Additional Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [Amazon EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review application logs
3. Check AWS CloudWatch logs
4. Verify all prerequisites are installed
5. Ensure AWS credentials have proper permissions

## 🎉 Success!

If you've made it this far, congratulations! You now have:

✅ A fully automated CI/CD pipeline
✅ A production-ready three-tier application on AWS
✅ Comprehensive monitoring with Prometheus and Grafana
✅ Infrastructure as Code with Terraform
✅ Containerized applications with Docker
✅ Kubernetes orchestration on Amazon EKS

Happy deploying! 🚀
