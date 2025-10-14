// Save this as: netlify/functions/create-vendor-auth.js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { vendor_code, vendor_name, email } = JSON.parse(event.body)

    // Validate input
    if (!vendor_code || !vendor_name || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: vendor_code, vendor_name, email' 
        })
      }
    }

    console.log('Creating auth for vendor:', vendor_code, email)

    // Step 1: Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUsers.users.find(u => u.email === email.toLowerCase())

    let authCreated = false
    let emailSent = false

    if (userExists) {
      console.log('User already exists:', email)
      // User exists, just send password reset email
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: `${process.env.URL || 'https://sku-test.netlify.app'}/vendor/index.html`
        }
      )

      if (!resetError) {
        emailSent = true
      } else {
        console.error('Password reset error:', resetError)
      }

    } else {
      // Step 2: Create new auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: false, // Require email confirmation
        user_metadata: {
          role: 'vendor',
          vendor_code: vendor_code.toUpperCase(),
          vendor_name: vendor_name
        }
      })

      if (createError) {
        console.error('User creation error:', createError)
        throw createError
      }

      console.log('Auth user created:', newUser.user.id)
      authCreated = true

      // Step 3: Send password reset email (serves as invitation)
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: `${process.env.URL || 'https://sku-test.netlify.app'}/vendor/index.html`
        }
      )

      if (!resetError) {
        emailSent = true
      } else {
        console.error('Password reset error:', resetError)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        vendor_code: vendor_code.toUpperCase(),
        vendor_name: vendor_name,
        email: email.toLowerCase(),
        authCreated: authCreated,
        emailSent: emailSent,
        message: emailSent 
          ? `Invitation email sent to ${email}` 
          : 'Auth created but email failed - check email configuration'
      })
    }

  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to create vendor authentication',
        details: error.toString()
      })
    }
  }
}
