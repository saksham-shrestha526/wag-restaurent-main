# WAG | Luxury Dining & AI Concierge

A high-performance, AI-driven restaurant management system built with React, Express, and SQLite.

## ✨ Features
- **AI Concierge**: Smart chatbot powered by Google Gemini.
- **Dynamic Menu**: Real-time menu management with category filtering.
- **Admin Dashboard**: Comprehensive stats, reservation management, and user controls.
- **Responsive Design**: Polished, luxury aesthetic with smooth Framer Motion animations.
- **Secure Authentication**: Session-based auth with hashed passwords.

## 🚀 Getting Started Locally

Follow these steps to set up and run the project on your machine.

### 1. Prerequisites
- **Node.js**: Installed (version 18.x or later).
- **VS Code**: Recommended IDE.

### 2. Recommended VS Code Extensions
- **ES7+ React/Redux/React-Native snippets**: For fast React development.
- **Tailwind CSS IntelliSense**: For autocompleting utility classes.
- **Prettier - Code formatter**: To keep your code clean and consistent.
- **ESLint**: For identifying potential issues.
- **SQLite Viewer**: To inspect the `restaurant.db` file directly in VS Code.

### 3. Setup Instructions
1. **Clone/Download the project** to your local drive.
2. **Open the project folder** in VS Code.
3. **Open the Terminal** (`Ctrl + \``) and install dependencies:
   ```bash
   npm install
   ```
4. **Create a `.env` file** in the root directory and add your credentials:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   MAIL_USERNAME=your_email_for_notifications
   MAIL_PASSWORD=your_email_app_password
   ADMIN_EMAIL=your_primary_admin_email
   ```
5. **Start the development server**:
   ```bash
   npm run dev
   ```
6. **Open your browser** to `http://localhost:3000`.

## 🛠 Tech Stack
- **Frontend**: React, Vite, Framer Motion, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, SQLite (Better-SQLite3).
- **AI**: Google Generative AI (Gemini).

## 🗄 Database
The application uses a local SQLite database (`restaurant.db`). It is automatically initialized and seeded with default data (including an admin user) on the first run.
