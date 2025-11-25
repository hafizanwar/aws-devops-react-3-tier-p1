# GitHub Actions Setup Guide

## Quick Start

1. **Configure GitHub Secrets**
   
   Navigate to your repository settings → Secrets and variables → Actions, and add:
   
   ```
   AWS_ACCESS_KEY_ID=<your-aws-access-key>
   AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
   ```

2. **Update Environment Variables** (if needed)
   
   Edit `.github/workflows/ci-cd.yml` to update:
   - `AWS_REGION`: Default is `us-east-1`
   - `EKS_CLUSTER_NAME`: Default is `ecommerce-cluster`

3. **Ensure ECR Repositories Exist**
   
   The following ECR repositories must be created (via Terraform):
   - `ecommerce-frontend`
   - `ecommerce-backend`
   - `ecommerce-database`

4. **Push to Main Branch**
   
   The workflow will automatically trigger on push to main:
   ```bash
   git add .
   git commit -m "Add CI/CD pipeline"
   git push origin main
   ```

## Workflow Behavior

### On Pull Request
- ✅ Runs tests
- ✅ Runs linting
- ❌ Does NOT build images
- ❌ Does NOT deploy

### On Push to Main
- ✅ Runs tests
- ✅ Runs linting
- ✅ Builds Docker images
- ✅ Scans images for vulnerabilities
- ✅ Pushes images to ECR
- ✅ Deploys to EKS
- ✅ Verifies deployment health

## Prerequisites

Before running the workflow, ensure:

1. ✅ Terraform infrastructure is deployed (VPC, EKS, ECR)
2. ✅ EKS cluster is accessible
3. ✅ ECR repositories are created
4. ✅ AWS credentials have proper permissions
5. ✅ Kubernetes manifests are in the `k8s/` directory

## Testing the Workflow

### Test Locally (Optional)

Install dependencies and run tests locally:

```bash
# Backend
cd backend
npm install
npm test
npx eslint . --ext .ts,.tsx

# Frontend
cd frontend
npm install
npx eslint . --ext .ts,.tsx
```

### Monitor Workflow Execution

1. Go to the "Actions" tab in your GitHub repository
2. Click on the latest workflow run
3. Monitor each job's progress
4. Review logs if any step fails

## Troubleshooting

### "Repository does not exist" error
- Ensure ECR repositories are created via Terraform
- Check repository names match exactly

### "Cluster not found" error
- Verify EKS cluster name in workflow matches actual cluster
- Ensure AWS credentials have EKS permissions

### "Unauthorized" error
- Check AWS credentials are correct
- Verify IAM permissions for ECR and EKS

### Pods not becoming ready
- Check pod logs: `kubectl logs -n ecommerce-app <pod-name>`
- Verify ConfigMaps and Secrets exist
- Check image pull permissions

## Security Best Practices

1. **Never commit AWS credentials** to the repository
2. **Use least privilege** IAM policies
3. **Rotate credentials** regularly
4. **Review Trivy scan results** and address vulnerabilities
5. **Enable branch protection** on main branch
6. **Require PR reviews** before merging

## Next Steps

After successful deployment:

1. Get the frontend service URL:
   ```bash
   kubectl get service frontend -n ecommerce-app
   ```

2. Access the application in your browser

3. Monitor with Prometheus and Grafana:
   ```bash
   kubectl get service grafana -n monitoring
   ```

4. Check application logs:
   ```bash
   kubectl logs -f deployment/backend -n ecommerce-app
   ```
