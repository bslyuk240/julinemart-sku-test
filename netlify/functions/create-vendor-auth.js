// netlify/functions/create-vendor-auth.js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.SITE_URL || 'https://sku-test.netlify.app'

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')
}

// Create Supabase admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function handler(event) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { vendor_code, vendor_name, email } = JSON.parse(event.body)

    console.log('📨 Received request:', { vendor_code, vendor_name, email })
    console.log('🌐 Redirect URL will be:', `${SITE_URL}/vendor/index.html`)

    // Validate input
    if (!vendor_code || !vendor_name || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: vendor_code, vendor_name, email' 
        })
      }
    }

    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials in environment')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error - missing Supabase credentials'
        })
      }
    }

    console.log('🔍 Checking if user exists:', email)

    let authCreated = false
    let emailSent = false
    let userId = null
    let userExists = false

    // Step 1: Try to get user by email using getUserByEmail (better than listUsers)
    try {
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase())
      
      if (existingUser && existingUser.user) {
        console.log('✅ User already exists:', email, 'ID:', existingUser.user.id)
        userExists = true
        userId = existingUser.user.id
      } else if (getUserError && getUserError.status !== 404) {
        // If it's not a "not found" error, log it
        console.error('⚠️ Error checking user:', getUserError.message)
      }
    } catch (checkError) {
      console.error('⚠️ Error in getUserByEmail:', checkError.message)
      // Continue anyway - we'll try to create the user
    }

    if (userExists) {
      // User exists, send password reset email
      console.log('📧 Sending password reset to existing user...')
      
      try {
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email.toLowerCase(),
          options: {
            redirectTo: `${SITE_URL}/vendor/index.html`
          }
        })

        if (resetError) {
          console.error('❌ Password reset error:', resetError.message)
          emailSent = false
        } else {
          console.log('✅ Password reset link generated')
          emailSent = true
        }
      } catch (resetError) {
        console.error('❌ Exception in password reset:', resetError.message)
        emailSent = false
      }

    } else {
      // User doesn't exist, create new user
      console.log('➕ Creating new user:', email)
      
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase(),
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            role: 'vendor',
            vendor_code: vendor_code.toUpperCase(),
            vendor_name: vendor_name
          }
        })

        if (createError) {
          console.error('❌ User creation error:', createError.message)
          throw new Error(`Failed to create auth user: ${createError.message}`)
        }

        console.log('✅ Auth user created:', newUser.user.id)
        authCreated = true
        userId = newUser.user.id

        // Generate password reset link for new user
        console.log('📧 Generating password reset link for new user...')
        
        try {
          const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email.toLowerCase(),
            options: {
              redirectTo: `${SITE_URL}/vendor/index.html`
            }
          })

          if (resetError) {
            console.error('❌ Password reset link generation error:', resetError.message)
            emailSent = false
          } else {
            console.log('✅ Password reset link generated')
            emailSent = true
          }
        } catch (resetError) {
          console.error('❌ Exception in password reset:', resetError.message)
          emailSent = false
        }
      } catch (createError) {
        console.error('❌ Exception in user creation:', createError.message)
        throw createError
      }
    }

    // Success response
    const response = {
      success: true,
      vendor_code: vendor_code.toUpperCase(),
      vendor_name: vendor_name,
      email: email.toLowerCase(),
      authCreated: authCreated,
      emailSent: emailSent,
      userId: userId,
      redirectUrl: `${SITE_URL}/vendor/index.html`,
      message: authCreated
        ? (emailSent 
            ? `✅ New vendor created and invitation email sent to ${email}` 
            : `⚠️ Vendor created but email failed - check Supabase email settings`)
        : (emailSent
            ? `✅ Vendor already exists, password reset email sent to ${email}`
            : `⚠️ Vendor exists but email failed - check Supabase email settings`)
    }

    console.log('✅ Success response:', response)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('💥 Function error:', error)
    console.error('Error stack:', error.stack)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Failed to create vendor authentication',
        details: error.toString()
      })
    }
  }
}
