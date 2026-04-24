# Campus Kart

A modern student marketplace application built with Next.js, allowing students to buy, sell, and exchange products on campus.

## Features

- **Product Listings** - Browse and search for products
- **Real-time Chat** - Direct messaging between buyers and sellers
- **User Profiles** - Create and manage student profiles
- **Authentication** - Secure login system with Firebase
- **Product Management** - Add and manage product listings
- **Firestore Integration** - Cloud database for seamless data sync

## Tech Stack

- **Frontend**: Next.js 15+, React
- **Backend**: Firebase/Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Cloud Storage

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lokeshraaj/Campus-Kart.git
cd Campus-Kart
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Add your Firebase configuration to `.env.local`

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
src/
├── app/                  # Next.js app directory
├── components/
│   └── screens/         # Page components
├── context/             # React Context for global state
├── hooks/               # Custom React hooks
├── lib/                 # Firebase and service configurations
└── data/                # Mock data and constants
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
