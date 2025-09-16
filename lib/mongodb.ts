import { MongoClient, type Db } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {
  tls: true,
  tlsAllowInvalidCertificates: true, // Allow for Windows SSL issues
  tlsAllowInvalidHostnames: true, // Allow for Windows hostname issues
  serverSelectionTimeoutMS: 10000, // Increased timeout
  connectTimeoutMS: 20000, // Increased timeout
  socketTimeoutMS: 20000, // Added socket timeout
  maxPoolSize: 10,
  minPoolSize: 1, // Reduced minimum pool size
  retryWrites: true,
  w: "majority" as const,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise

export async function getDatabase(): Promise<Db> {
  try {
    console.log("[v0] Attempting to connect to MongoDB...")
    const client = await clientPromise
    console.log("[v0] MongoDB connection successful")
    return client.db("blog-app")
  } catch (error) {
    console.error("[v0] MongoDB connection failed:", error)
    if (error instanceof Error) {
      if (error.message.includes("SSL") || error.message.includes("TLS")) {
        console.error("[v0] SSL/TLS Error - This is common on Windows. Connection options have been adjusted.")
      }
      if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
        console.error("[v0] Network Error - Check your internet connection and MongoDB Atlas network access.")
      }
    }
    throw error
  }
}
