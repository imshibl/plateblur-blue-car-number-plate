# PlateBlur

A privacy-first license plate blurring app. FastAPI processes images locally in memory and returns the resulting JPEG to the browser; it does not use cloud storage, a database, or authentication.

## Run locally

Create and activate a virtual environment, then install and start the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In another terminal, install the frontend dependencies and start TanStack Start:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set `VITE_API_URL` if the API is hosted somewhere other than `http://localhost:8000`.

To check the production build locally, run `npm run build` followed by `npm run preview`.

## Demo photo credits

- [Ferrari with clear plate](https://commons.wikimedia.org/wiki/File:Bruges_Belgium_Ferrari-with-special-car-plate-XXXXXX-01.jpg) by CEphoto, Uwe Aranas, CC BY-SA 3.0.
- [Distant rally car](https://commons.wikimedia.org/wiki/File:0_car,_40._ADAC_Stormarn_Rallye,_Luetjensee_(TR256767).jpg) by Matti Blume, CC BY-SA 4.0.
