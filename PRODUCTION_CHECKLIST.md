# Production Readiness Checklist

## ✅ Completed

### Authentication & Security
- [x] Fixed RLS circular dependency
- [x] Signup/login working properly
- [x] Middleware auth checks
- [x] Session management
- [x] Logout functionality
- [x] Service-role client properly secured

### Performance
- [x] Database query caching (React cache)
- [x] Loading states on all pages
- [x] Error boundaries
- [x] Optimized Supabase clients
- [x] Database indexes added (need to run migration)

### Code Quality
- [x] No TypeScript errors
- [x] Proper error handling in API routes
- [x] Rate limiting on widget endpoint
- [x] Input validation on all endpoints

## ⏳ TODO Before Launch

### Critical
- [ ] **Run SQL migrations in Supabase**:
  - `supabase/migrations/0007_performance_indexes.sql`
- [ ] Test widget embed on external site
- [ ] Test all dashboard pages with real data
- [ ] Verify email sending (if enabled)
- [ ] Test Google Calendar integration
- [ ] Set up proper error logging (Sentry/LogRocket)
- [ ] Add API rate limiting (production-grade with Redis)
- [ ] Environment variables validation
- [ ] Set up database backups

### High Priority
- [ ] Add request/response logging
- [ ] Implement monitoring/alerting
- [ ] Test automation webhooks
- [ ] Add CORS configuration for widget
- [ ] Set up CI/CD pipeline
- [ ] Add health check endpoint
- [ ] Document API endpoints
- [ ] Create admin tools for support

### Medium Priority
- [ ] Add E2E tests (Playwright)
- [ ] Optimize bundle size
- [ ] Add CDN for static assets
- [ ] Implement CSP headers
- [ ] Add analytics tracking
- [ ] Create user documentation
- [ ] Set up staging environment

### Low Priority
- [ ] Add internationalization
- [ ] Performance monitoring dashboard
- [ ] A/B testing framework
- [ ] Advanced analytics
- [ ] Mobile app (if needed)

## 🧪 Manual Testing Checklist

### Authentication Flow
- [ ] Sign up with new email
- [ ] Log in with existing account
- [ ] Log out
- [ ] Session persistence
- [ ] Multiple business switching

### Dashboard Pages
- [ ] Overview - KPIs display correctly
- [ ] Inbox - conversations load
- [ ] Leads - kanban board works
- [ ] Bookings - calendar displays
- [ ] Knowledge Base - documents upload
- [ ] Analytics - charts render
- [ ] Settings - all forms work

### Widget
- [ ] Widget loads on external site
- [ ] Messages send/receive
- [ ] Lead capture works
- [ ] RAG retrieval works
- [ ] Tool calling (booking, escalation)
- [ ] Rate limiting triggers correctly

### API Endpoints
- [ ] POST /api/widget/message
- [ ] POST /api/v1/organizations/provision
- [ ] POST /api/v1/businesses
- [ ] POST /api/v1/knowledge-base/documents
- [ ] GET /api/auth/callback
- [ ] POST /api/integrations/google-calendar/connect

## 🚀 Deployment Steps

1. **Environment Setup**
   - Set all env variables in production
   - Verify Supabase connection
   - Test Gemini API key
   - Configure Google OAuth (if using calendar)

2. **Database**
   - Run all migrations
   - Verify RLS policies
   - Set up backups
   - Monitor query performance

3. **Deploy Application**
   - Deploy to Vercel/hosting provider
   - Configure custom domain
   - Set up SSL
   - Test all routes

4. **Monitoring**
   - Set up error tracking
   - Configure uptime monitoring
   - Enable performance monitoring
   - Set up alerts

5. **Post-Launch**
   - Monitor logs for errors
   - Check database performance
   - Verify widget loads correctly
   - Test all critical flows

## 📊 Performance Targets

### Response Times
- Page load: < 2 seconds
- API response: < 500ms
- Widget message: < 3 seconds (includes AI)
- Database queries: < 100ms

### Reliability
- Uptime: 99.9%
- Error rate: < 0.1%
- Success rate: > 99%

## 🔒 Security Checklist

- [x] RLS policies on all tables
- [x] Authentication required for dashboard
- [x] Service-role key protected
- [ ] Rate limiting on all public endpoints
- [ ] Input sanitization
- [ ] CORS configured properly
- [ ] Headers security (CSP, HSTS, etc.)
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS protection
- [ ] Secrets not in code

## 📝 Documentation Needed

- [ ] API documentation
- [ ] Widget installation guide
- [ ] Admin user guide
- [ ] Developer setup guide
- [ ] Troubleshooting guide
- [ ] Architecture overview
