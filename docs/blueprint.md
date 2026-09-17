# **App Name**: OmniStock

## Core Features:

- OmniStock Dashboard: Provides an intuitive overview of key inventory metrics such as total stock value, monthly movements, and alerts for low-stock items, leveraging data from the backend.
- Warehouse & Product Manager: Interface for administrators to efficiently create, update, and soft-delete warehouses and product listings. This includes setting unique SKUs, categories, and low-stock thresholds.
- Stock Movement Operations: Facilitates goods receipts (stock-in) with delivery note management, goods issues (stock-out) with real-time stock checks, and seamless inter-warehouse transfers. Ensures all operations update stock and log movements in the database via transactions.
- User & Access Management: Secure user login with JWT authentication, implementing role-based access control (RBAC) to restrict features based on predefined roles (Admin, Warehouse Manager, Operator), and providing an audit trail of user activities.
- Advanced Reporting & Analytics: Generate and visualize detailed inventory reports, including stock balance, movement history, low-stock products, and best sellers. Features filtering options by warehouse, product, supplier, and date range, with export functionality for PDF and Excel.
- AI-powered System Generation Tool: A tool that leverages AI to generate initial system architectural artifacts such as PostgreSQL SQL schema, ER diagrams, Prisma schemas, API endpoint lists, backend folder structures, controller/service examples, and authentication flow diagrams.

## Style Guidelines:

- The visual design centers on organization, efficiency, and professionalism. The chosen color scheme is light. Primary interactive elements and important highlights use a deep, professional blue (#2E68B8).
- The background features a subtle, almost ethereal light blue-gray tint (#F0F2F4), providing a clean canvas that's easy on the eyes.
- An accent color is introduced as a muted, desaturated blue-green (#669995), subtly drawing attention to actionable items and status indicators without overpowering the primary colors. It is harmonious and provides clear distinction.
- Headline font: 'Space Grotesk' (sans-serif) to provide a modern, technical, and clean aesthetic for titles and section headers.
- Body font: 'Inter' (sans-serif) for its excellent legibility and neutral design, ensuring clarity for forms, tables, and extensive reporting data.
- Code font: 'Source Code Pro' (monospace sans-serif) for displaying any technical output or code snippets within the application, offering distinct readability.
- Utilize a consistent set of minimalist, vector-based icons with clear and unambiguous meanings. Opt for a modern outline or duotone style to maintain a professional and clean appearance, particularly for navigation, action buttons, and status indicators.
- A structured and intuitive layout featuring clear content hierarchy, responsive design for optimal viewing across various devices, and efficient use of space to present complex data. Key elements include a consistent sidebar navigation and modular dashboard widgets.
- Subtle, fluid animations and transitions are employed for interactive elements such as data loading, form submissions, and page transitions. These enhance the user experience by providing clear visual feedback without causing distraction.