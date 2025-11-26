# Complete Deployment Guide

## 🚀 One-Command Deployment

Deploy the entire three-tier application with monitoring stack using a single command:

```bash
./deploy.sh
```

This script will:
1. ✅ Deploy Terraform infrastructure (VPC, EKS, ECR)
2. ✅ Configure kubectl for EKS cluster
3. ✅ Install EBS CSI Driver with proper IAM permissions
4. ✅ Build and push Docker images to ECR
5. ✅ Deploy database (PostgreSQL with persistent storage)
6. ✅ Deploy backend API
7. ✅ Deploy monitoring stack (Prometheus & Grafana)
8. ✅ Display access information

## Prerequisites

Before running the deployment script, ensure you have:

### Required Tools
- **Terraform** (v1.0+): `brew install terraform` or download from [terraform.io](https://www.terraform.io/downloads)
- **AWS CLI** (v2): `brew install awscli` or download from [aws.amazon.com/cli](https://aws.amazon.com/cli/)
- **kubectl**: `brew install kubectl` or download from [kubernetes.io](https://kubernetes.io/docs/tasks/tools/)
- **Docker**: Download from [docker.com](https://www.docker.com/products/docker-desktop)

### AWS Configuration
```bash
# Configure AWS credentials
aws configure

# Verify credentials
aws sts get-caller-identity
```

### Required AWS Permissions
Your AWS user/role needs permissions for:
- EC2 (VPC, Subnets, Security Groups)
- EKS (Cluster, Node Groups)
- ECR (Repositories)
- IAM (Roles, Policies)
- EBS (Volumes for persistent storage)

## Step-by-Step Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# Make the script executable (first time only)
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

The script will guide you through the entire process and display access information at the end.

### Option 2: Manual Deployment

If you prefer to deploy step by step:

#### 1. Deploy Infrastructure
```bash
cd terraform
terraform init
terraform apply
cd ..
```

#### 2. Configure kubectl
```bash
aws eks update-kubeconfig --region us-east-1 --name aws-devops-three-tier-eks
kubectl get nodes
```

#### 3. Install EBS CSI Driver
```bash
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.25"

# Add IAM policy
aws iam attach-role-policy \
  --role-name aws-devops-three-tier-eks-node-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy
```

#### 4. Build and Push Docker Images
```bash
# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd backend
docker build -t ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/dev-backend:latest .
docker push ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/dev-backend:latest
cd ..

# Build and push database
cd database
docker build -t ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/dev-database:latest .
docker push ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/dev-database:latest
cd ..

# Build and push frontend
cd frontend-simple
docker build -t ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest .
docker push ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/dev-frontend:latest
cd ..
```

#### 5. Deploy Kubernetes Resources
```bash
# Deploy in order
kubectl apply -f k8s/00-namespaces.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-database-configmap.yaml
kubectl apply -f k8s/02-database.yaml

# Wait for database
kubectl wait --for=condition=Ready pod -l app=postgres -n ecommerce-app --timeout=300s

# Deploy backend
kubectl apply -f k8s/03-backend-configmap.yaml
kubectl apply -f k8s/03-backend.yaml

# Wait for backend
kubectl wait --for=condition=Ready pod -l app=backend -n ecommerce-app --timeout=300s

# Deploy network policies
kubectl apply -f k8s/05-network-policies.yaml
kubectl apply -f k8s/06-hpa.yaml
```

#### 6. Deploy Monitoring
```bash
# Prometheus
kubectl apply -f k8s/07-prometheus-configmap.yaml
kubectl apply -f k8s/08-prometheus-rules.yaml
kubectl apply -f k8s/09-prometheus.yaml

# Grafana
kubectl apply -f k8s/10-grafana-dashboards.yaml
kubectl apply -f k8s/11-grafana-config.yaml
kubectl apply -f k8s/12-grafana.yaml

# Expose Prometheus
kubectl patch svc prometheus -n monitoring -p '{"spec":{"type":"LoadBalancer"}}'
```

## Accessing the Application

### Backend API
```bash
# Get the LoadBalancer URL
kubectl get svc backend -n ecommerce-app

# Access endpoints
curl http://<BACKEND-URL>:3000/api/health
curl http://<BACKEND-URL>:3000/api/products
```

### Prometheus
```bash
# Get the LoadBalancer URL
kubectl get svc prometheus -n monitoring

# Open in browser
http://<PROMETHEUS-URL>:9090
```

### Grafana
```bash
# Port forward to local machine
kubectl port-forward -n monitoring svc/grafana-service 3000:80

# Open in browser
http://localhost:3000

# Credentials
Username: admin
Password: changeme_grafana_password
```

## Verification

### Check All Pods
```bash
kubectl get pods -n ecommerce-app
kubectl get pods -n monitoring
```

Expected output:
```
NAMESPACE         NAME                          READY   STATUS    RESTARTS   AGE
ecommerce-app     backend-xxxxx-xxxxx           1/1     Running   0          5m
ecommerce-app     backend-xxxxx-xxxxx           1/1     Running   0          5m
ecommerce-app     postgres-0                    1/1     Running   0          10m
monitoring        grafana-xxxxx-xxxxx           1/1     Running   0          3m
monitoring        prometheus-xxxxx-xxxxx        1/1     Running   0          3m
```

### Check Services
```bash
kubectl get svc -A
```

### Test Backend API
```bash
BACKEND_URL=$(kubectl get svc backend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://${BACKEND_URL}:3000/api/health
```

## Cleanup

To destroy all resources:

```bash
# Delete Kubernetes resources first
kubectl delete namespace ecommerce-app
kubectl delete namespace monitoring

# Destroy Terraform infrastructure
cd terraform
terraform destroy -auto-approve
cd ..
```

## Troubleshooting

### Pods Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n <namespace>

# Check logs
kubectl logs <pod-name> -n <namespace>
```

### Database Not Ready
```bash
# Check PVC status
kubectl get pvc -n ecommerce-app

# Check EBS CSI driver
kubectl get pods -n kube-system | grep ebs
```

### LoadBalancer Pending
```bash
# Check service events
kubectl describe svc <service-name> -n <namespace>

# AWS may take 2-3 minutes to provision LoadBalancers
```

### Image Pull Errors
```bash
# Verify ECR repositories exist
aws ecr describe-repositories --region us-east-1

# Verify images are pushed
aws ecr describe-images --repository-name dev-backend --region us-east-1
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    VPC (10.0.0.0/16)                   │ │
│  │                                                         │ │
│  │  ┌──────────────┐              ┌──────────────┐       │ │
│  │  │ Public Subnet│              │ Public Subnet│       │ │
│  │  │  us-east-1a  │              │  us-east-1b  │       │ │
│  │  │              │              │              │       │ │
│  │  │  NAT Gateway │              │  NAT Gateway │       │ │
│  │  └──────────────┘              └──────────────┘       │ │
│  │         │                             │                │ │
│  │  ┌──────────────┐              ┌──────────────┐       │ │
│  │  │Private Subnet│              │Private Subnet│       │ │
│  │  │  us-east-1a  │              │  us-east-1b  │       │ │
│  │  │              │              │              │       │ │
│  │  │ ┌──────────┐ │              │ ┌──────────┐ │       │ │
│  │  │ │EKS Nodes │ │              │ │EKS Nodes │ │       │ │
│  │  │ │          │ │              │ │          │ │       │ │
│  │  │ │ Backend  │ │              │ │ Backend  │ │       │ │
│  │  │ │ Database │ │              │ │Prometheus│ │       │ │
│  │  │ │ Grafana  │ │              │ │          │ │       │ │
│  │  │ └──────────┘ │              │ └──────────┘ │       │ │
│  │  └──────────────┘              └──────────────┘       │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    ECR Repositories                     │ │
│  │  - dev-backend    - dev-database    - dev-frontend     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Cost Estimation

Approximate monthly costs (us-east-1):
- EKS Cluster: $73/month
- EC2 Instances (2x t3.medium): ~$60/month
- NAT Gateways (2): ~$65/month
- EBS Volumes: ~$10/month
- LoadBalancers: ~$20/month
- **Total: ~$228/month**

## Next Steps

1. ✅ Deploy infrastructure and application
2. ✅ Access and test the backend API
3. ✅ Configure Grafana dashboards
4. ⏳ Set up CI/CD pipeline (GitHub Actions)
5. ⏳ Configure custom domain and SSL
6. ⏳ Set up backup and disaster recovery
7. ⏳ Implement application monitoring and alerting

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review AWS CloudWatch logs
3. Check Kubernetes events: `kubectl get events -A`
4. Review the ACCESS_GUIDE.md file

## License

This project is for educational purposes.
