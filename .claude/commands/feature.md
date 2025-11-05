---
description: Add a new feature to FreeTimeChat
---

I need to add a new feature to the time tracking system.

When implementing:

1. **Determine the interface**: Is this for the chat interface, admin interface, or both?

2. **For chat features**:
   - Create/update chat handler in `/lib/chat/handlers`
   - Add natural language pattern matching
   - Implement response generation
   - Add example phrases users might say
   - Test with various phrasings

3. **For admin features**:
   - Create component in `/components/admin`
   - Add route in `/app/admin`
   - Implement API endpoint if needed
   - Follow traditional UI patterns

4. **For both**:
   - Update TypeScript types in `/types`
   - Add database migrations if needed
   - Update API endpoints
   - Add tests for new functionality
   - Update documentation

5. **Always consider**:
   - Security implications
   - Error handling
   - User feedback/confirmation
   - Data validation

Please analyze the feature request and implement following these guidelines.
