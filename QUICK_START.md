# Quick Start Guide

Get your three-tier application deployed to AWS in under 30 minutes!

## 🎯 What You'll Deploy

- ✅ VPC with public/private subnets across 2 AZs
- ✅ EKS Kubernetes cluster with 2 worker nodes
- ✅ ECR repositories for Docker images
- ✅ React frontend + Node.js backend + PostgreSQL database
- ✅ Prometheus & Grafana monitoring
- ✅ Automated CI/CD with GitHub Actions

## 📋 Prerequisites Checklist

- [ ] AWS Account with admin access
- [ ] AWS CLI installed and configured
- [ ] Terraform >= 1.5.0 installed
- [ ] kubectl >= 1.28 installed
- [ ] Docker installed
- [ ] Code pushed to GitHub

## 🚀 5-Step Deployment

### Step 1: Configure AWS (2 minutes)

```bash
# Configure AWS credentials
aws configure

# Verify
aws sts get-caller-identity
```

### Step 2: Deploy Infrastructure (20 minutes)

```bash
# Navigate to terraform directory
cd terraform

# Copy variables file
cp terraform.tfvars.example terraform.tfvars

# Initialize Terraform
terraform init

# Deploy (takes ~15-20 minutes)
terraform apply -auto-approve

# Save outputs
terraform output > ../outputs.txt
```

### Step 3: Configure kubectl (1 minute)

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name ecommerce-cluster

# Verify
kubectl get nodes
```

### Step 4: Build & Push Images (5 minutes)

```bash
# Get ECR registry URL
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build and push frontend
cd frontend
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

### Step 5: Deploy Applications (3 minutes)

```bash
# Update image URLs in manifests
cd k8s
sed -i '' "s|image:.*ecommerce-frontend.*|image: ${ECR_REGISTRY}/ecommerce-frontend:latest|g" 04-frontend.yaml
sed -i '' "s|image:.*ecommerce-backend.*|image: ${ECR_REGISTRY}/ecommerce-backend:latest|g" 03-backend.yaml
sed -i '' "s|image:.*ecommerce-database.*|image: ${ECR_REGISTRY}/ecommerce-database:latest|g" 02-database.yaml

# Deploy everything
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

# Deploy monitoring
kubectl apply -f 07-prometheus-configmap.yaml
kubectl apply -f 08-prometheus-rules.yaml
kubectl apply -f 09-prometheus.yaml
kubectl apply -f 10-grafana-dashboards.yaml
kubectl apply -f 11-grafana-config.yaml
kubectl apply -f 12-grafana.yaml

# Wait for pods
kubectl get pods -n ecommerce-app -w
```

## ✅ Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n ecommerce-app
kubectl get pods -n monitoring

# Get service URLs
kubectl get svc -n ecommerce-app
kubectl get svc -n monitoring

# Test backend API
BACKEND_URL=$(kubectl get svc backend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://${BACKEND_URL}:3000/api/health

# Get frontend URL
FRONTEND_URL=$(kubectl get svc frontend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Frontend: http://${FRONTEND_URL}"

# Get Grafana URL
GRAFANA_URL=$(kubectl get svc grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Grafana: http://${GRAFANA_URL}:3000"
```

## 🔄 Set Up CI/CD (5 minutes)

### 1. Create IAM User for GitHub Actions

```bash
# Create user
aws iam create-user --user-name github-actions-deployer

# Create access key
aws iam create-access-key --user-name github-actions-deployer

# Save the AccessKeyId and SecretAccessKey!

# Attach policies
aws iam attach-user-policy \
  --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-user-policy \
  --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
```

### 2. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `AWS_ACCESS_KEY_ID`: From step 1
- `AWS_SECRET_ACCESS_KEY`: From step 1
- `AWS_REGION`: `us-east-1`
- `EKS_CLUSTER_NAME`: `ecommerce-cluster`

### 3. Update EKS Access

```bash
# Edit aws-auth ConfigMap
kubectl edit configmap aws-auth -n kube-system

# Add this under mapUsers:
# - userarn: arn:aws:iam::<AWS_ACCOUNT_ID>:user/github-actions-deployer
#   username: github-actions-deployer
#   groups:
#     - system:masters
```

### 4. Test CI/CD

```bash
# Make a change
echo "# Updated" >> README.md

# Commit and push
git add .
git commit -m "Test CI/CD"
git push origin main

# Watch workflow in GitHub Actions tab
```

## 🎉 Success!

Your application is now deployed! Here's what you have:

✅ **Infrastructure**: VPC, EKS, ECR all provisioned
✅ **Applications**: Frontend, Backend, Database running
✅ **Monitoring**: Prometheus & Grafana collecting metrics
✅ **CI/CD**: Automated deployments on every push

## 📊 Access Your Services

### Frontend Application
```bash
kubectl get svc frontend -n ecommerce-app
# Open the EXTERNAL-IP in your browser
```

### Grafana Dashboards
```bash
kubectl get svc grafana -n monitoring
# Open the EXTERNAL-IP:3000 in your browser
# Username: admin
# Password: Check k8s/01-secrets.yaml
```

### Backend API
```bash
kubectl get svc backend -n ecommerce-app
# API available at EXTERNAL-IP:3000/api
```

## 🔍 Useful Commands

```bash
# View logs
kubectl logs -f deployment/frontend -n ecommerce-app
kubectl logs -f deployment/backend -n ecommerce-app
kubectl logs -f statefulset/postgres -n ecommerce-app

# Check pod status
kubectl get pods -n ecommerce-app
kubectl describe pod <pod-name> -n ecommerce-app

# Scale deployments
kubectl scale deployment frontend --replicas=3 -n ecommerce-app

# Restart deployment
kubectl rollout restart deployment/frontend -n ecommerce-app

# View events
kubectl get events -n ecommerce-app --sort-by='.lastTimestamp'
```

## 🧹 Clean Up

When you're done, destroy everything:

```bash
# Delete Kubernetes resources
kubectl delete namespace ecommerce-app
kubectl delete namespace monitoring

# Destroy infrastructure
cd terraform
terraform destroy -auto-approve
```

## 📚 Next Steps

- [ ] Read [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions
- [ ] Read [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) for CI/CD details
- [ ] Review [terraform/README.md](terraform/README.md) for infrastructure docs
- [ ] Check [k8s/README.md](k8s/README.md) for Kubernetes details
- [ ] Explore Grafana dashboards for monitoring
- [ ] Set up custom domain and SSL certificate
- [ ] Configure backup and disaster recovery
- [ ] Implement additional security measures

## 🆘 Troubleshooting

### Pods not starting?
```bash
kubectl describe pod <pod-name> -n ecommerce-app
kubectl logs <pod-name> -n ecommerce-app
```

### Can't access services?
```bash
# Check if LoadBalancer is provisioned
kubectl get svc -n ecommerce-app

# If EXTERNAL-IP shows <pending>, wait a few minutes
```

### Database connection issues?
```bash
# Check database pod
kubectl logs statefulset/postgres -n ecommerce-app

# Test connectivity from backend
kubectl exec -it deployment/backend -n ecommerce-app -- nc -zv postgres 5432
```

### GitHub Actions failing?
1. Check secrets are set correctly
2. Verify IAM permissions
3. Check workflow logs in GitHub Actions tab

## 💡 Tips

- **Cost Savings**: Scale down when not in use
  ```bash
  kubectl scale deployment frontend --replicas=0 -n ecommerce-app
  kubectl scale deployment backend --replicas=0 -n ecommerce-app
  ```

- **Monitor Costs**: Check AWS Cost Explorer regularly

- **Security**: Rotate credentials every 90 days

- **Backups**: Set up automated database backups

- **Alerts**: Configure Slack/email notifications

## 📞 Support

- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting
- Review AWS CloudWatch logs
- Check Kubernetes events
- Review application logs

---

**Congratulations!** 🎊 You've successfully deployed a production-ready three-tier application on AWS!
