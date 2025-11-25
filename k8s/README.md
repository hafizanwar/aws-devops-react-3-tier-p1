# Kubernetes Manifests

This directory contains all Kubernetes manifests for deploying the three-tier e-commerce application to Amazon EKS.

## Directory Structure

```
k8s/
├── 00-namespaces.yaml           # Application and monitoring namespaces
├── 01-secrets.yaml              # Database and Grafana credentials
├── 02-database-configmap.yaml   # PostgreSQL initialization scripts
├── 02-database.yaml             # PostgreSQL StatefulSet, Service, and PVC
├── 03-backend-configmap.yaml    # Backend application configuration
├── 03-backend.yaml              # Backend Deployment and Service
├── 04-frontend-configmap.yaml   # Frontend application configuration
├── 04-frontend.yaml             # Frontend Deployment and Service
├── 05-network-policies.yaml     # Network policies for security
├── 06-hpa.yaml                  # HorizontalPodAutoscalers for frontend and backend
├── 07-prometheus-configmap.yaml # Prometheus configuration and scrape configs
├── 08-prometheus-rules.yaml     # Prometheus alerting rules
├── 09-prometheus.yaml           # Prometheus Deployment, Service, PVC, and RBAC
├── 10-grafana-dashboards.yaml   # Grafana dashboard definitions (ConfigMap)
├── 11-grafana-config.yaml       # Grafana configuration and datasources
├── 12-grafana.yaml              # Grafana Deployment, Service, and PVC
└── README.md                    # This file
```

## Prerequisites

1. Amazon EKS cluster is provisioned and running
2. kubectl is configured to connect to your EKS cluster
3. Docker images are built and pushed to Amazon ECR
4. Metrics Server is installed in the cluster (required for HPA)

## Deployment Instructions

### 1. Update Image References

Before deploying, update the image references in the deployment files with your ECR registry URL:

```bash
# Replace <ECR_REGISTRY> with your actual ECR registry URL
# Example: 123456789012.dkr.ecr.us-east-1.amazonaws.com

sed -i 's|<ECR_REGISTRY>|YOUR_ECR_REGISTRY_URL|g' k8s/03-backend.yaml
sed -i 's|<ECR_REGISTRY>|YOUR_ECR_REGISTRY_URL|g' k8s/04-frontend.yaml
```

### 2. Update Secrets

**IMPORTANT**: Update the secrets in `01-secrets.yaml` with secure passwords before deploying to production:

```yaml
# Database credentials
POSTGRES_USER: your_secure_username
POSTGRES_PASSWORD: your_secure_password

# Grafana credentials
admin-user: admin
admin-password: your_secure_grafana_password
```

### 3. Deploy in Order

Deploy the manifests in the following order:

```bash
# 1. Create namespaces
kubectl apply -f k8s/00-namespaces.yaml

# 2. Create secrets
kubectl apply -f k8s/01-secrets.yaml

# 3. Deploy database
kubectl apply -f k8s/02-database-configmap.yaml
kubectl apply -f k8s/02-database.yaml

# 4. Deploy backend
kubectl apply -f k8s/03-backend-configmap.yaml
kubectl apply -f k8s/03-backend.yaml

# 5. Deploy frontend
kubectl apply -f k8s/04-frontend-configmap.yaml
kubectl apply -f k8s/04-frontend.yaml

# 6. Apply network policies
kubectl apply -f k8s/05-network-policies.yaml

# 7. Create HorizontalPodAutoscalers
kubectl apply -f k8s/06-hpa.yaml

# 8. Deploy Prometheus monitoring (optional)
kubectl apply -f k8s/07-prometheus-configmap.yaml
kubectl apply -f k8s/08-prometheus-rules.yaml
kubectl apply -f k8s/09-prometheus.yaml

# 9. Deploy Grafana monitoring (optional)
kubectl apply -f k8s/10-grafana-dashboards.yaml
kubectl apply -f k8s/11-grafana-config.yaml
kubectl apply -f k8s/12-grafana.yaml
```

Or deploy all at once:

```bash
kubectl apply -f k8s/
```

### 4. Verify Deployment

Check the status of all resources:

```bash
# Check pods in ecommerce-app namespace
kubectl get pods -n ecommerce-app

# Check services
kubectl get svc -n ecommerce-app

# Check HPA status
kubectl get hpa -n ecommerce-app

# Check network policies
kubectl get networkpolicies -n ecommerce-app
```

### 5. Access the Application

Get the LoadBalancer URL for the frontend:

```bash
kubectl get svc frontend -n ecommerce-app
```

The application will be accessible at the EXTERNAL-IP address shown.

## Configuration

### Database Configuration

The database is configured with:
- **Storage**: 20Gi persistent volume (EBS)
- **Resources**: 256Mi-512Mi memory, 250m-500m CPU
- **Probes**: Liveness and readiness checks using `pg_isready`

### Backend Configuration

The backend is configured with:
- **Replicas**: 2 (can scale to 5 with HPA)
- **Resources**: 256Mi-512Mi memory, 250m-500m CPU
- **Probes**: HTTP health checks on `/api/health`
- **Metrics**: Prometheus scraping enabled on `/metrics`

### Frontend Configuration

The frontend is configured with:
- **Replicas**: 2 (can scale to 5 with HPA)
- **Resources**: 128Mi-256Mi memory, 100m-200m CPU
- **Probes**: HTTP health checks on `/`
- **Service Type**: LoadBalancer (publicly accessible)

## Network Policies

The following network policies are enforced:

1. **frontend-to-backend**: Allows frontend pods to communicate with backend on port 3000
2. **backend-to-database**: Allows backend pods to communicate with database on port 5432
3. **deny-frontend-to-database**: Prevents direct frontend to database communication
4. **prometheus-scrape-all**: Allows Prometheus (in monitoring namespace) to scrape metrics
5. **allow-external-to-frontend**: Allows external traffic to frontend on port 80

## Auto-scaling

HorizontalPodAutoscalers are configured for:

- **Frontend**: 2-5 replicas, scales at 70% CPU utilization
- **Backend**: 2-5 replicas, scales at 70% CPU utilization

Ensure the Metrics Server is installed:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Troubleshooting

### Pods not starting

```bash
# Check pod logs
kubectl logs -n ecommerce-app <pod-name>

# Describe pod for events
kubectl describe pod -n ecommerce-app <pod-name>
```

### Database connection issues

```bash
# Check database pod logs
kubectl logs -n ecommerce-app postgres-0

# Test database connectivity from backend pod
kubectl exec -it -n ecommerce-app <backend-pod-name> -- sh
nc -zv postgres 5432
```

### Network policy issues

```bash
# Check network policies
kubectl get networkpolicies -n ecommerce-app

# Describe network policy
kubectl describe networkpolicy -n ecommerce-app <policy-name>
```

### HPA not scaling

```bash
# Check HPA status
kubectl describe hpa -n ecommerce-app frontend-hpa

# Check metrics server
kubectl get deployment metrics-server -n kube-system
```

## Cleanup

To remove all resources:

```bash
# Delete all resources in ecommerce-app namespace
kubectl delete namespace ecommerce-app

# Delete monitoring namespace (if created)
kubectl delete namespace monitoring
```

## Security Notes

1. **Secrets**: Always use strong passwords and consider using external secret management (AWS Secrets Manager, HashiCorp Vault)
2. **Network Policies**: Ensure network policies are properly configured before exposing to production
3. **RBAC**: Implement proper RBAC policies for cluster access
4. **Image Scanning**: Scan Docker images for vulnerabilities before deployment
5. **TLS**: Configure TLS/SSL for the LoadBalancer in production

## Monitoring with Prometheus

### Prometheus Configuration

Prometheus is configured to:
- **Scrape Interval**: 15 seconds
- **Retention Period**: 15 days
- **Storage**: 50Gi persistent volume

### Scrape Targets

Prometheus automatically discovers and scrapes:
- Kubernetes API server
- Kubernetes nodes and cAdvisor metrics
- All pods with `prometheus.io/scrape: "true"` annotation
- Backend service `/metrics` endpoint
- PostgreSQL metrics (if exporter is deployed)

### Alerting Rules

The following alerts are configured:

**Pod Alerts:**
- High pod restart rate (>3 restarts in 5 minutes)
- Pod not in Running state

**Resource Alerts:**
- High CPU usage (>80% for 5 minutes)
- High memory usage (>85% for 5 minutes)
- Node resource exhaustion

**Application Alerts:**
- High API error rate (>5% for 2 minutes)
- High API response time (p95 >1s)
- Service down

**Database Alerts:**
- Connection pool exhausted (>90% utilization)
- Database down
- Too many idle connections
- Slow queries

**Storage Alerts:**
- Persistent volume space low (<15%)
- Persistent volume almost full (<5%)

### Accessing Prometheus

Prometheus is deployed as a ClusterIP service. To access the UI:

```bash
# Port forward to access Prometheus UI
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

Then open http://localhost:9090 in your browser.

### Verifying Prometheus

```bash
# Check Prometheus pod status
kubectl get pods -n monitoring

# Check Prometheus logs
kubectl logs -n monitoring -l app=prometheus

# Check if targets are being scraped
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets
```

## Monitoring with Grafana

### Grafana Configuration

Grafana is configured with:
- **Storage**: 10Gi persistent volume for data persistence
- **Resources**: 512Mi-1Gi memory, 250m-500m CPU
- **Datasource**: Prometheus (auto-configured)
- **Dashboards**: Pre-configured dashboards for cluster, application, and database metrics

### Pre-configured Dashboards

Three dashboards are automatically provisioned:

1. **Kubernetes Cluster Overview**
   - Cluster CPU and memory usage by node
   - Pod count by namespace
   - Node status and health
   - Network I/O metrics
   - Disk usage by node

2. **Application Metrics**
   - Request rate by service
   - Response time percentiles (p50, p95, p99)
   - Error rate by service with alerting
   - Active connections
   - CPU and memory usage for frontend and backend pods

3. **Database Metrics**
   - Connection pool status
   - Query performance and average duration
   - Transaction rate (commits and rollbacks)
   - Cache hit ratio
   - CPU and memory usage
   - Disk I/O operations
   - Database size

### Accessing Grafana

Grafana is deployed as a LoadBalancer service. Get the external URL:

```bash
# Get Grafana LoadBalancer URL
kubectl get svc grafana-service -n monitoring

# Wait for EXTERNAL-IP to be assigned
kubectl get svc grafana-service -n monitoring -w
```

Access Grafana at the EXTERNAL-IP address on port 80.

**Default Credentials:**
- Username: `admin`
- Password: Check the secret or use the value from `01-secrets.yaml`

```bash
# Get Grafana admin password
kubectl get secret grafana-credentials -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d
```

### Verifying Grafana

```bash
# Check Grafana pod status
kubectl get pods -n monitoring -l app=grafana

# Check Grafana logs
kubectl logs -n monitoring -l app=grafana

# Check if Grafana can reach Prometheus
kubectl exec -it -n monitoring <grafana-pod-name> -- wget -O- http://prometheus-service:9090/api/v1/status/config
```

### Customizing Dashboards

Dashboards can be customized through the Grafana UI. Changes are persisted in the Grafana database stored on the persistent volume.

To add new dashboards:
1. Create dashboard JSON in the `10-grafana-dashboards.yaml` ConfigMap
2. Apply the updated ConfigMap: `kubectl apply -f k8s/10-grafana-dashboards.yaml`
3. Restart Grafana pod to load new dashboards: `kubectl rollout restart deployment/grafana -n monitoring`

## Next Steps

1. Set up CI/CD pipeline with GitHub Actions (Task 13)
2. Configure logging aggregation
3. Implement backup and disaster recovery procedures
4. Set up alerting notifications (Slack, email, PagerDuty)
