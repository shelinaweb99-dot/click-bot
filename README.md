
# Click-to-Earn Bot (MongoDB Version)

This application uses **React** for the frontend and **MongoDB** for the backend database.

## 1. Prerequisites
- **Node.js** installed on your computer.
- A free **MongoDB Atlas** account (to get your database URL).

## 2. Setup Database
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a free cluster.
3. Click "Connect" -> "Drivers" -> Copy the connection string.
   - It looks like: `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority`
   - **Important:** Replace `<password>` with your actual database password.

## 3. Local Development
To run this app locally, you must use Vercel CLI because it needs to serve the Backend API functions (`/api/index.js`).

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link the project (follow prompts):
   ```bash
   vercel link
   ```

3. Set your Database URL:
   ```bash
   vercel env add MONGODB_URI
   # Paste your connection string when prompted
   # Select 'Development', 'Preview', and 'Production'
   ```

4. **Start the App:**
   ```bash
   vercel dev
   ```
   
   Open `http://localhost:3000` in your browser.

## 4. Deployment
To go live:
```bash
vercel --prod
```
