# ClearClause: AI Legal Simplifier 🤖⚖️

ClearClause is an AI-powered web application that makes complex legal language accessible to everyone by providing plain English explanations and risk analysis.

## 🚀 Quick Start
Vercel Deployment:
https://clause-clarity.vercel.app/

Presentation:
https://iiithydstudents-my.sharepoint.com/:p:/g/personal/virat_garg_students_iiit_ac_in/EUrBMPcAdGtBnW2GSigup80BWVGSCZIh6TL8oSrT0C2GTQ?e=Rz4TkC

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Gemini API key
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/clause-clarity-ai-wizard.git

# Navigate to project directory
cd clause-clarity-ai-wizard

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript
- **UI Components**: Tailwind CSS
- **AI Integration**: Google Gemini API
- **Database & Auth**: Supabase
- **Deployment**: Vercel/Netlify

## 📦 Key Features

- 🔍 Legal text analysis and simplification
- ⚠️ Risk assessment and identification
- 👤 User authentication
- 📝 Analysis history tracking
- 💾 Export functionality

## 📁 Project Structure

```
clause-clarity-ai-wizard/
├── src/
│   ├── components/       # React components
│   ├── lib/             # Utility functions & services
│   │   └── api-services.ts  # API integration logic
│   ├── integrations/    # Third-party service integrations
│   └── pages/           # Page components
├── public/              # Static assets
└── tests/              # Test files
```

## 💻 API Integration

The application integrates with:
- Google Gemini API for text analysis
- Supabase for data storage and authentication

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request


## 🙏 Acknowledgments

- Google Gemini API
- Supabase
- React community

