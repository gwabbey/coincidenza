export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const OTP_SERVER_IP = process.env.OTP_SERVER_IP || "localhost:8080";

    let isServerAvailable = false;
    try {
        const res = await fetch(`http://${OTP_SERVER_IP}/otp`, { cache: "no-store" });
        if (res.ok) isServerAvailable = true;
    } catch (e) { }

    return isServerAvailable ? children : (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">oh no</h1>
            <div className="text-2xl">il servizio non funziona al momento... 💔</div>
            <div>riprova tra qualche minuto</div>
        </div>
    );
}