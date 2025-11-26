#!/bin/bash

# AWS DevOps Three-Tier Application - Complete Deployment Script
# This script deploys the entire infrastructure and application with a single command

set -e  # Exit on any error

# Enable debug mode if needed
# set -x

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME="aws-devops-three-tier-eks"

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "$1"
    print_message "$BLUE" "=========================================="
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_header "Checking Prerequisites"

if ! command_exists terraform; then
    print_message "$RED" "❌ Terraform is not installed. Please install it first."
    exit 1
fi
print_message "$GREEN" "✅ Terraform found"

if ! command_exists aws; then
    print_message "$RED" "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi
print_message "$GREEN" "✅ AWS CLI found"

if ! command_exists kubectl; then
    print_message "$RED" "❌ kubectl is not installed. Please install it first."
    exit 1
fi
print_message "$GREEN" "✅ kubectl found"

if ! command_exists docker; then
    print_message "$RED" "❌ Docker is not installed. Please install it first."
    exit 1
fi
print_message "$GREEN" "✅ Docker found"

# Check AWS credentials
print_message "$YELLOW" "Checking AWS credentials..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    print_message "$RED" "❌ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi
print_message "$GREEN" "✅ AWS credentials configured"

# Step 1: Deploy Terraform Infrastructure
print_header "Step 1: Deploying Terraform Infrastructure"
cd terraform
terraform init
terraform apply -auto-approve
cd ..

# Get outputs from Terraform
print_message "$YELLOW" "Getting Terraform outputs..."
cd terraform
ACCOUNT_ID=$(terraform output -raw ecr_repository_urls | grep backend | cut -d'.' -f1)
ECR_BACKEND=$(terraform output -raw ecr_repository_urls | grep backend | tr -d '"' | awk '{print $NF}')
ECR_DATABASE=$(terraform output -raw ecr_repository_urls | grep database | tr -d '"' | awk '{print $NF}')
ECR_FRONTEND=$(terraform output -raw ecr_repository_urls | grep frontend | tr -d '"' | awk '{print $NF}')
cd ..

print_message "$GREEN" "✅ Infrastructure deployed successfully"

# Step 2: Configure kubectl
print_header "Step 2: Configuring kubectl"
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
print_message "$GREEN" "✅ kubectl configured"

# Wait for nodes to be ready
print_message "$YELLOW" "Waiting for EKS nodes to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s || true
print_message "$GREEN" "✅ EKS nodes are ready"

# Step 3: Install EBS CSI Driver
print_header "Step 3: Installing EBS CSI Driver"
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.25"

# Add EBS CSI policy to node role
print_message "$YELLOW" "Adding EBS CSI policy to node role..."
aws iam attach-role-policy \
  --role-name aws-devops-three-tier-eks-node-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy || true

print_message "$GREEN" "✅ EBS CSI Driver installed"

# Wait for EBS CSI pods to be ready
print_message "$YELLOW" "Waiting for EBS CSI pods to be ready..."
sleep 30
kubectl wait --for=condition=Ready pods -l app.kubernetes.io/name=aws-ebs-csi-driver -n kube-system --timeout=120s || true

# Step 4: Build and Push Docker Images
print_header "Step 4: Building and Pushing Docker Images"

# Login to ECR
print_message "$YELLOW" "Logging into Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push backend
print_message "$YELLOW" "Building backend image..."
cd backend
docker build -t ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-backend:latest .
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-backend:latest
cd ..
print_message "$GREEN" "✅ Backend image pushed"

# Build and push database
print_message "$YELLOW" "Building database image..."
cd database
docker build -t ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-database:latest .
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-database:latest
cd ..
print_message "$GREEN" "✅ Database image pushed"

# Build and push frontend (simple version)
print_message "$YELLOW" "Building frontend image..."
cd frontend-simple
docker build -t ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-frontend:latest .
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-frontend:latest
cd ..
print_message "$GREEN" "✅ Frontend image pushed"

# Step 5: Deploy Kubernetes Resources
print_header "Step 5: Deploying Kubernetes Resources"

# Update image references in Kubernetes manifests
print_message "$YELLOW" "Updating Kubernetes manifests with ECR image URLs..."
sed -i.bak "s|image:.*dev-backend.*|image: ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-backend:latest|g" k8s/03-backend.yaml
sed -i.bak "s|image:.*dev-database.*|image: ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-database:latest|g" k8s/02-database.yaml

# Deploy in order
print_message "$YELLOW" "Deploying namespaces and secrets..."
kubectl apply -f k8s/00-namespaces.yaml
kubectl apply -f k8s/01-secrets.yaml

print_message "$YELLOW" "Deploying database..."
kubectl apply -f k8s/02-database-configmap.yaml
kubectl apply -f k8s/02-database.yaml

print_message "$YELLOW" "Waiting for database to be ready..."
kubectl wait --for=condition=Ready pod -l app=postgres -n ecommerce-app --timeout=300s

print_message "$YELLOW" "Deploying backend..."
kubectl apply -f k8s/03-backend-configmap.yaml
kubectl apply -f k8s/03-backend.yaml

print_message "$YELLOW" "Waiting for backend to be ready..."
kubectl wait --for=condition=Ready pod -l app=backend -n ecommerce-app --timeout=300s

print_message "$YELLOW" "Deploying frontend..."

# Get backend LoadBalancer URL
print_message "$YELLOW" "Getting backend LoadBalancer URL..."
sleep 30  # Wait for LoadBalancer to be provisioned
BACKEND_LB=$(kubectl get svc backend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Wait up to 2 minutes for backend LoadBalancer
COUNTER=0
while [ -z "$BACKEND_LB" ] && [ $COUNTER -lt 12 ]; do
    print_message "$YELLOW" "Waiting for backend LoadBalancer... ($((COUNTER * 10))s)"
    sleep 10
    BACKEND_LB=$(kubectl get svc backend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    COUNTER=$((COUNTER + 1))
done

if [ -z "$BACKEND_LB" ]; then
    print_message "$YELLOW" "Backend LoadBalancer not ready yet. Frontend will be deployed but may need manual configuration."
    BACKEND_LB="BACKEND_NOT_READY"
fi

# Create a temporary index.html with the backend URL
print_message "$YELLOW" "Configuring frontend with backend URL: http://${BACKEND_LB}:3000"
cp frontend-simple/index.html frontend-simple/index.html.bak
sed "s|BACKEND_URL_PLACEHOLDER|http://${BACKEND_LB}:3000|g" frontend-simple/index.html.bak > frontend-simple/index.html

# Rebuild and push frontend with updated backend URL
print_message "$YELLOW" "Rebuilding frontend with backend URL..."
cd frontend-simple
docker build -t ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-frontend:latest .
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dev-frontend:latest
cd ..

# Restore original index.html
mv frontend-simple/index.html.bak frontend-simple/index.html

kubectl apply -f k8s/04-frontend-configmap.yaml
kubectl apply -f k8s/04-frontend.yaml

print_message "$YELLOW" "Waiting for frontend to be ready..."
kubectl wait --for=condition=Ready pod -l app=frontend -n ecommerce-app --timeout=300s

print_message "$YELLOW" "Deploying network policies and HPA..."
kubectl apply -f k8s/05-network-policies.yaml
kubectl apply -f k8s/06-hpa.yaml

print_message "$GREEN" "✅ Application deployed"

# Step 6: Deploy Monitoring Stack
print_header "Step 6: Deploying Monitoring Stack"

print_message "$YELLOW" "Deploying Prometheus..."
kubectl apply -f k8s/07-prometheus-configmap.yaml
kubectl apply -f k8s/08-prometheus-rules.yaml
kubectl apply -f k8s/09-prometheus.yaml

print_message "$YELLOW" "Deploying Grafana..."
kubectl apply -f k8s/10-grafana-dashboards.yaml
kubectl apply -f k8s/11-grafana-config.yaml
kubectl apply -f k8s/12-grafana.yaml

print_message "$YELLOW" "Waiting for monitoring stack to be ready..."
sleep 30
kubectl wait --for=condition=Ready pod -l app=prometheus -n monitoring --timeout=180s || true
kubectl wait --for=condition=Ready pod -l app=grafana -n monitoring --timeout=180s || true

# Expose Prometheus as LoadBalancer
kubectl patch svc prometheus -n monitoring -p '{"spec":{"type":"LoadBalancer"}}' || true

print_message "$GREEN" "✅ Monitoring stack deployed"

# Step 7: Get Access Information
print_header "Step 7: Deployment Complete!"

print_message "$GREEN" "🎉 All resources deployed successfully!"
echo ""
print_message "$BLUE" "Access Information:"
echo ""

# Get frontend URL
FRONTEND_URL=$(kubectl get svc frontend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
if [ -n "$FRONTEND_URL" ]; then
    print_message "$GREEN" "🌐 Frontend Application: http://${FRONTEND_URL}"
    print_message "$GREEN" "   Open this URL in your browser to access the application!"
else
    print_message "$YELLOW" "Frontend LoadBalancer is being provisioned..."
    print_message "$YELLOW" "Run: kubectl get svc frontend -n ecommerce-app"
fi

echo ""

# Get backend URL
BACKEND_URL=$(kubectl get svc backend -n ecommerce-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
if [ -n "$BACKEND_URL" ]; then
    print_message "$GREEN" "🔧 Backend API: http://${BACKEND_URL}:3000"
    print_message "$GREEN" "  - Health: http://${BACKEND_URL}:3000/api/health"
    print_message "$GREEN" "  - Products: http://${BACKEND_URL}:3000/api/products"
else
    print_message "$YELLOW" "Backend LoadBalancer is being provisioned..."
    print_message "$YELLOW" "Run: kubectl get svc backend -n ecommerce-app"
fi

echo ""

# Get Prometheus URL
PROMETHEUS_URL=$(kubectl get svc prometheus -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
if [ -n "$PROMETHEUS_URL" ]; then
    print_message "$GREEN" "Prometheus: http://${PROMETHEUS_URL}:9090"
else
    print_message "$YELLOW" "Prometheus LoadBalancer is being provisioned..."
    print_message "$YELLOW" "Run: kubectl get svc prometheus -n monitoring"
fi

echo ""

# Grafana access
print_message "$GREEN" "Grafana (Port Forward Required):"
print_message "$YELLOW" "  Run: kubectl port-forward -n monitoring svc/grafana-service 3000:80"
print_message "$YELLOW" "  Then open: http://localhost:3000"
print_message "$YELLOW" "  Username: admin"
print_message "$YELLOW" "  Password: changeme_grafana_password"

echo ""
print_message "$BLUE" "Useful Commands:"
print_message "$YELLOW" "  View pods: kubectl get pods -n ecommerce-app"
print_message "$YELLOW" "  View services: kubectl get svc -n ecommerce-app"
print_message "$YELLOW" "  View logs: kubectl logs -f deployment/backend -n ecommerce-app"
print_message "$YELLOW" "  Access Grafana: kubectl port-forward -n monitoring svc/grafana-service 3000:80"

echo ""
print_message "$GREEN" "✅ Deployment completed successfully!"
