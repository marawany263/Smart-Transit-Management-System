# موقفي — Smart Transit Demo

A bilingual, responsive Beni Suef transit-management demonstration built with Vite and vanilla JavaScript. Mawqifi uses a vivid violet, aqua, and coral visual identity. All sample data and simulated authentication stay in the browser's `localStorage`; this project does not connect to Firebase or require API keys.

## Run locally

1. Install Node.js (18 or newer).
2. From the project folder run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Choose **دخول العرض التجريبي** to open the role-based demo login.

Use `npm run build` to create a production build, or `npm run preview` to preview it locally.

## Publish on GitHub Pages

Push changes to the `main` branch to build and deploy the site automatically with GitHub Actions. The project is configured for:

`https://marawany263.github.io/Smart-Transit-Management-System/`

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** if it is not already enabled.

## Demo accounts

Passengers can enter directly from the homepage or choose **Continue as passenger** on the login screen; no username or password is required. Use the email and password shown on the login screen for staff accounts:

| Role | Email | Password |
| --- | --- | --- |
| Driver | `driver@demo.local` | `driver123` |
| Station Admin | `admin@demo.local` | `admin123` |
| Super Admin | `super@demo.local` | `super123` |

Staff authentication is simulated for presentation only and is **not production security**. Passenger access is an unauthenticated local demo session.

## Demo workflows

- Search routes and inspect stops, fares, durations, and vehicle availability.
- Apply as a driver from the homepage or demo login, then approve or reject applications from an administrator account.
- Add and edit vehicles, cycle vehicle status, and add routes.
- From the vehicle registry, record a vehicle's departure and expected return time; monitor elapsed and remaining time, then record its return.
- Submit passenger ratings and complaints, track complaints by ID, review status updates, and receive local notifications.
- View role-specific dashboards, sample statistics, charts, and coverage of all seven Beni Suef administrative centers.
- Switch the admin trip-activity chart between weekly and monthly demo data.
- Station Admin tools are scoped to Mohiuddin station; Super Admin tools cover the full seven-center network.
- Switch Arabic/English from the language control.
- Choose **إعادة ضبط بيانات العرض** in the sidebar to restore the original sample data.

Added and updated records persist across browser refreshes. The data, charts, stations, times, and authentication are demonstration-only and do not represent live services.
