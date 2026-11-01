# 🏡 EstateHub — Smart Real Estate Marketplace

**EstateHub** is an AI-powered real estate marketplace designed to help clients find suitable properties and connect directly with brokers. The platform provides property listings, advanced search and filtering, user communication, and an AI assistant that understands natural-language requirements and recommends matching properties.

## 📌 Project Overview

Finding the right property can be time-consuming when users need to browse numerous listings and manually apply multiple filters. EstateHub aims to simplify this process by combining a modern real estate marketplace with AI-powered property recommendations.

Users can search for properties by location, price, size, and category. Brokers can manage their property listings, while administrators oversee users, properties, reviews, and platform activities.

## ✨ Key Features

### 🏠 Property Marketplace
- Browse available properties for sale and rent.
- Search and filter properties by location, price, size, and type.
- View detailed property information and images.
- Explore featured properties and broker profiles.
- Discover similar properties.

### 🤖 AI Property Assistant
- Understand property requirements written in natural language.
- Convert user requests into structured search criteria.
- Recommend matching properties from the available database.
- Suggest similar properties based on user requirements.

**Example request:**

> I need a 3-bedroom flat in Uttara under 80 lakh.

The AI assistant will interpret the requirements and help the user find matching properties from the available listings.

**AI technologies:** Large Language Model (LLM) integration, Natural Language Processing (NLP), and rule-based or semantic property matching.

### 👤 User Roles

**Client**
- Search and explore properties.
- View property details.
- Comment on property listings.
- Message brokers.
- Save favorite properties.
- Submit reviews and feedback.

**Broker**
- Create, edit, and delete property listings.
- Manage property information.
- Communicate with interested clients.
- Receive email notifications for new interactions.

**Admin**
- Manage client and broker accounts.
- Manage property listings.
- Moderate reviews and reported content.
- Monitor and maintain the overall platform.

### 💬 Communication and Notifications
- Client-to-broker messaging.
- Property comments and interactions.
- Email notifications for relevant new activities.
- Broker and client review functionality.

### 🎨 Modern User Interface
- Responsive design for desktop, tablet, and mobile devices.
- Modern property cards and broker profiles.
- Interactive animations and visual elements.
- User-friendly navigation and search experience.

## 🛠️ Technologies Used

| Component | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js, Express.js |
| Programming Language | JavaScript |
| Database | MySQL |
| Styling | Tailwind CSS |
| Authentication | JWT / Secure Cookies |
| AI Integration | LLM API + NLP |
| Containerization | Docker |

## 🏗️ System Workflow

1. The client enters property requirements through the search interface or AI assistant.
2. The AI assistant interprets the natural-language request.
3. The system converts the request into searchable property criteria.
4. The backend retrieves matching properties from the MySQL database.
5. The system displays matching or similar properties to the client.
6. The client can view property details and contact the broker.

**Workflow:**

`Client → AI Assistant → Backend → MySQL Database → Matching Properties → Client`

## 📂 Project Modules

- **Authentication Module:** Registration, login, and role-based access.
- **Property Management Module:** Create, update, delete, and view listings.
- **Search Module:** Property search, filters, and sorting.
- **AI Recommendation Module:** Natural-language requirement processing and property matching.
- **Communication Module:** Comments and private messaging.
- **Notification Module:** Email notifications for user interactions.
- **Review Module:** Broker and property-related feedback.
- **Admin Module:** User management, property moderation, and platform administration.

## ⚙️ Installation and Setup

### Prerequisites

Install the following tools before running the project:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [MySQL](https://dev.mysql.com/downloads/installer/)
- [Git](https://git-scm.com/)
- A code editor such as Visual Studio Code

### 1. Clone the Repository

```bash
git clone https://github.com/Mahmud394/Estatehub.git
cd Estatehub
```

### 2. Install Dependencies

Navigate to the relevant frontend and backend directories and install their dependencies.

```bash
cd client
npm install
```

If the backend is maintained in a separate directory, open another terminal and run:

```bash
cd server
npm install
```

*Note: Adjust the directory names and commands according to the actual project structure.*

### 3. Configure Environment Variables

Create the appropriate `.env` file for the backend and configure the required database and application settings.

Example:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=estatehub
JWT_SECRET=your_secure_secret
LLM_API_KEY=your_llm_api_key
```

Use the actual environment variable names expected by your application. Never commit real passwords, API keys, or secrets to GitHub.

### 4. Configure the Database

1. Start your MySQL server.
2. Create the `estatehub` database.
3. Import the project's SQL file if one is provided, or run the database setup scripts.
4. Ensure the backend database configuration matches your MySQL settings.

### 5. Run the Application

Start the backend from its directory:

```bash
npm run dev
```

Start the frontend from the `client` directory in a separate terminal:

```bash
npm run dev
```

Open the local URL displayed in the frontend terminal, commonly `http://localhost:5173` for a Vite application.

*The commands above assume the corresponding scripts are configured in each directory's `package.json`.*

## 🗓️ Development Roadmap

| Timeline | Planned Work |
|---|---|
| Weeks 1–2 | Project setup, database schema, frontend and backend configuration |
| Weeks 3–4 | Authentication, role permissions, property management, search and filters |
| Weeks 5–6 | Homepage design, property cards, broker profiles and animations |
| Weeks 7–8 | Comments, messaging, favorites, reviews and email notifications |
| Week 9 | AI property assistant and similar-property recommendations |
| Weeks 10–11 | Admin dashboard, testing, documentation and Docker support |

## 🔐 Security and Ethical Considerations

- Protect user information and authentication credentials.
- Enforce role-based permissions for clients, brokers, and administrators.
- Validate user inputs and restrict unauthorized access.
- Protect API keys and sensitive environment variables.
- Use available property information to generate recommendations.
- Do not treat AI recommendations as legal, financial, or property-ownership verification.

## 🚀 Future Improvements

- Map-based property search.
- Bangla and multilingual AI assistance.
- Virtual property tours.
- More advanced personalized recommendation models.
- Improved property comparison tools.
- Enhanced analytics for brokers and administrators.

## 🎯 Project Objectives

- Develop a user-friendly real estate marketplace.
- Simplify property discovery through search and filtering.
- Connect clients and brokers through direct communication.
- Integrate AI to interpret natural-language property requirements.
- Recommend relevant properties using available listing data.

## 👥 Team

Developed as an academic capstone project by a team of Software Engineering students.

## 📄 License

This project is developed for educational and academic purposes. A formal open-source license can be added if the project is intended for public reuse.

---

**EstateHub — Find the Right Property, Smarter.** 🏡🤖
