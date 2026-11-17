# BlockTiks / Sahra

Flutter mobile app, Fastify + DynamoDB backend, and Studio/buyer web apps.

## Run the mobile app against the local backend

1. Start the backend and seed demo events:

   ```bash
   ./dev.sh --seed
   ```

   The API listens on `http://localhost:4000`.

2. Run the Flutter app:

   ```bash
   flutter run
   ```

   - iOS simulator/macOS use `http://localhost:4000` automatically.
   - Android emulator uses `http://10.0.2.2:4000` automatically.
   - For a physical device, pass your machine's LAN IP:

     ```bash
     flutter run --dart-define=API_BASE_URL=http://192.168.1.10:4000
     ```

If the app says it cannot reach the backend, start `./dev.sh --seed` first. If events are missing, publish events in Studio or reseed with `./dev.sh --seed`.
