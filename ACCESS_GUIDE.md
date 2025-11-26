# Application Access Guide

## 🎉 Successfully Deployed Components

### ✅ Backend API (Public Access)
**URL**: http://ac48c2c1fe9334e6fbb96c88e29a98b5-1924781635.us-east-1.elb.amazonaws.com:3000

**Endpoints**:
- Health Check: `/api/health`
- Products: `/api/products`
- Orders: `/api/orders`
- Customers: `/api/customers`

**Test it**:
```bash
curl http://ac48c2c1fe9334e6fbb96c88e29a98b5-1924781635.us-east-1.elb.amazonaws.com:3000/api/health
curl http://ac48c2c1fe9334e6fbb96c88e29a98b5-1924781635.us-east-1.elb.amazonaws.com:3000/api/products
```

---

### 📊 Prometheus (Public Access)
**URL**: http://a2056a078689e40dabc0124db6304033-2114929334.us-east-1.elb.amazonaws.com:9090

**Features**:
- Metrics collection from backend and database
- Query interface for metrics
- Alerting rules configured

**Access**: Open the URL in your browser

---

### 📈 Grafana (Port Forward Required)
**Credentials**:
- Username: `admin`
- Password: `changeme_grafana_password`

**Access via Port Forward**:
```bash
kubectl port-forward -n monitoring svc/grafana-service 3000:80
```

Then open: http://localhost:3000

**Pre-configured Dashboards**:
- Kubernetes Cluster Monitoring
- Application Performance
- Database Metrics

---

### 🗄️ PostgreSQL Database (Internal Only)
**Connection Details**:
- Host: `postgres.ecommerce-app.svc.cluster.local`
- Port: `5432`
- Database: `ecommerce`
- Username: `ecommerce_user`
- Password: (stored in Kubernetes secret)

**Access via Port Forward**:
```bash
kubectl port-forward -n ecommerce-app svc/postgres 5432:5432
```

Then connect using:
```bash
psql -h localhost -p 5432 -U ecommerce_user -d ecommerce
```

---

### 🎨 Frontend UI (Not Yet Deployed)
The frontend has build issues and is currently disabled in the CI/CD pipeline.

**To deploy manually**:
1. Fix the frontend build errors
2. Build the Docker image locally
3. Push to ECR
4. Deploy using kubectl

---

## 🚀 Quick Access Commands

### View All Running Pods
```bash
kubectl get pods -n ecommerce-app
kubectl get pods -n monitoring
```

### View All Services
```bash
kubectl get svc -n ecommerce-app
kubectl get svc -n monitoring
```

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/backend -n ecommerce-app

# Database logs
kubectl logs -f statefulset/postgres -n ecommerce-app

# Prometheus logs
kubectl logs -f deployment/prometheus -n monitoring

# Grafana logs
kubectl logs -f deployment/grafana -n monitoring
```

### Port Forward Services
```bash
# Grafana
kubectl port-forward -n monitoring svc/grafana-service 3000:80

# Prometheus (if needed locally)
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Backend (if LoadBalancer is removed)
kubectl port-forward -n ecommerce-app svc/backend 3000:3000

# Database
kubectl port-forward -n ecommerce-app svc/postgres 5432:5432
```

---

## 📝 Notes

1. **LoadBalancer Limit**: Your AWS account has reached the LoadBalancer limit. Grafana is configured as ClusterIP and requires port-forwarding.

2. **Frontend**: Currently disabled due to build issues. The backend API is fully functional and can be tested directly.

3. **Monitoring**: Prometheus and Grafana are collecting metrics from your backend and database.

4. **Security**: Change the default Grafana password after first login.

5. **Persistence**: Both PostgreSQL and Grafana use persistent volumes (EBS) for data storage.

---

## 🔧 Troubleshooting

### If pods are not running:
```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

### If services are not accessible:
```bash
kubectl get svc -A
kubectl describe svc <service-name> -n <namespace>
```

### To restart a deployment:
```bash
kubectl rollout restart deployment/<deployment-name> -n <namespace>
```

---

## 🎯 Next Steps

1. ✅ Backend API is working
2. ✅ Database is running with persistent storage
3. ✅ Prometheus is collecting metrics
4. ✅ Grafana dashboards are configured
5. ⏳ Fix frontend build issues
6. ⏳ Deploy frontend to complete the three-tier architecture

