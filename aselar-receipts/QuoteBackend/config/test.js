// test-firebase.js
require('dotenv').config(); // Load environment variables

const admin = require('firebase-admin');
// Check if environment variables are loaded
console.log('Environment Variables Check:');
console.log('✓ FIREBASE_PROJECT_ID:', "asela-app"? '✅ Set' : '❌ Missing');
console.log('✓ FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing');
console.log('✓ FIREBASE_STORAGE_BUCKET:', "gs://asela-app.firebasestorage.app" ? '✅ Set' : '❌ Missing');
console.log('✓ FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('✓ FIREBASE_PRIVATE_KEY_ID:', "58513be3f8e22d29b9d74a1bf706b6067187568a"? '✅ Set' : '❌ Missing');
console.log('✓ FIREBASE_CLIENT_ID:', process.env.FIREBASE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('✓ FIREBASE_CLIENT_X509_CERT_URL:', process.env.FIREBASE_CLIENT_X509_CERT_URL ? '✅ Set' : '❌ Missing');
console.log('🔄 Testing Firebase configuration...\n');


// Test Firebase initialization
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id:"asela-app" ,//process.env.FIREBASE_PROJECT_ID,
      private_key_id: "58513be3f8e22d29b9d74a1bf706b6067187568a",// process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDa1+ZvMiOor6B5\nRvXdOFZe3M7tNqMYRzoDNTKJCNPN/GbdxjRItN+0dQJFpPCS234KffwqxWrIYxl1\nGk6dkHJo/W9sD8icjD2nUt7K4fv326ZH9qGvhheus6fRgHw8SZEzF8cKKGbm0Jhn\nLROTSf6TRycVy+b0q1EAk8L09rNW54DYcLYiNaXRuo8ebA5n9+g2HKLFf0fqzPKl\nyKlqJjBIDH9UX4nCs1mtfWUyxZ6CyzS6Ob0MH2/3JLFN6teuNmGbyroqeikRSz+I\n6kof2y4jdQV2QCxIdKnr1/Ov/F0tnbhxdCf30Sx+JCRjp5yP32/pVxBst8ki9DwO\nk7SGgJBjAgMBAAECggEAUddeEQWiOkp76/7yoamY+17+b834DnNMqbhyTrcjZqxW\n1+dw1CP4aSc9E0iMw48cQtY8wM4Vkh0lfxq4fcpwTv1Adxwr/QehYvrl4N/EeDwH\nonAEpXyzTJ1ZTEsNqwokKARjZlQXr4ghBqzf3jxU3UVFw6v+kk+jOmEIDs5X4U5/\nYAsTYTrwrsSCS8i7ww1neSbfnbPUu4noqfxAfm0XqGnqZ8SKI+52jZKxP4B7Qi/I\n47hcjxGbiF5d5gi/HMUSuctimKUHUK9leJYTFbgmh3be1Gk4bT18wzMcQ0+QY68F\ntU0nT/SrfPJeurxQHXuLMxTZ/F2FD7WlCjmvpUxSGQKBgQDvP2Bir3TQtU228U2M\nubucNKSYj22Qr3xxVgkotF04UGkhTQlOMdUa+Fp0sdh0iHkbWEG6NrW3ZlFBusDV\naFoLuPhd+Wr0qjcypfXUbTTuSlBROImwf7KwZdIBzf173zP2Z7bhxc/IuYf8rgTc\npPawUseYjZQKmv9kBGrR8iJitQKBgQDqKsTQSRA3ac+s+4Z7dSFVHliaOQqZGqKn\nb/jiJU/oljiD7/i9Ohq/pFvovahFM4nqzXJaI91dAPymSvM4+qoGyU2WfFS9Cd5v\nDNg9jAKnrU0KRlcJmoHs0Ke0NdSEilfRzoxVEW1d8ZE+SnJ+ozpMBDvgBJSGxcNu\nOKdl4redtwKBgQCiUa1jRwdKUrfXVv/2ak0PPeguWaFMeMNFYcn1A+n7OxMYtNuL\nYePj2HwGkGL7LVx9YPO3E0dWluSqY7pRD+uH6IcZuw8F0DaC9nZDGZS/10uGz4Ub\naoghhfNlpgxE7rqigtthcoP2+2l31dkWmhWEq6Ufq261g1Oi2BxhNJZ/wQKBgBfU\nJFUBqlnJNa3npoa3o52yyddfyJlN4ZFiTpRMsbX8W2HpsIko+YHY6tVjP1VTakxv\nfZx4m9UT/aG6bMe2kkjAgVm36zOVZoIsb3DL55VCiF1sTP0YMPJ1RSuMcsTOAyPB\nffxGGrf9lgcdskr6tzr3D1S7gpW4WCvGLhqrGH4/AoGBANR8/z/YP3yKiZYRDbqt\nqMkeh2GZPOCiPainwhXJCYX42Z/Fzj+MuZjH5yKdYNboJxWhLdHpbgLoXTVjkG/3\no3dyaq//X6w/2Q3AAlEWiB68E19ssT9wA4/77FLuGGSza5LvnqbCYhW+PxHsMwMH\nMyyfHd+7a4cqSvv+dWyGZJxh\n-----END PRIVATE KEY-----\n",//process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email:"firebase-adminsdk-fbsvc@asela-app.iam.gserviceaccount.com",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40asela-app.iam.gserviceaccount.com",//process.env.FIREBASE_CLIENT_X509_CERT_URL
    }),
    storageBucket:"gs://asela-app.firebasestorage.app",// process.env.FIREBASE_STORAGE_BUCKET
  });
  console.log('✅ Firebase Admin initialized successfully!');
  
} catch (error) {
  console.log('❌ Firebase initialization failed:');
  console.error(error.message);
  process.exit(1);
}


console.log('\n' + '='.repeat(50) + '\n');

// Test Storage connection
async function testStorageConnection() {
  try {
    console.log('🔄 Testing Storage connection...');
    
    const bucket = admin.storage().bucket();
    console.log('✅ Storage bucket created:', bucket.name);
    
    // Try to list files (this tests the connection)
    const [files] = await bucket.getFiles({ maxResults: 5 });
    console.log('✅ Storage connection successful!');
    console.log(`📁 Current files in bucket: ${files.length}`);
    
    if (files.length > 0) {
      console.log('📄 Sample files:');
      files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name}`);
      });
    } else {
      console.log('📁 Bucket is empty (this is normal for new projects)');
    }
    
  } catch (error) {
    console.log('❌ Storage connection failed:');
    console.error('Error details:', error.message);
    
    // Common error solutions
    if (error.message.includes('Permission denied')) {
      console.log('\n💡 Possible solutions:');
      console.log('   - Check your service account has Storage Admin role');
      console.log('   - Verify your Firebase Storage rules allow access');
    }
    if (error.message.includes('not found')) {
      console.log('\n💡 Possible solutions:');
      console.log('   - Verify your FIREBASE_STORAGE_BUCKET value is correct');
      console.log('   - Make sure Firebase Storage is enabled in your project');
    }
  }
}