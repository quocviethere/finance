# Finance Tracker

A simple personal finance tracker built with React, Vite, Firebase (Cloud Firestore) and Chart.js.

## Features

* Add, edit and delete transactions in Vietnamese đồng (VND)
* Data stored in Firebase Cloud Firestore
* Statistics view:
  * Pie chart by categories
  * Bar chart by month
* Calendar view to see daily totals
* Responsive UI

## Getting Started

### Prerequisites

* Node.js ≥ 18
* Firebase project (already configured in `src/firebase.js`)

### Installation

```bash
# move into project root
cd finance

# install packages
npm install

# start development server
npm run dev
```

The app will be available at http://localhost:5173.

### Build for production

```bash
npm run build
```

This generates static files in `dist/`.

## Firebase Setup

The `firebaseConfig` object is already populated. If you fork this template, create your own Firebase project and replace the keys in `src/firebase.js`.

Make sure Cloud Firestore is enabled and create a collection named `transactions` with no further configuration.

## License

MIT 