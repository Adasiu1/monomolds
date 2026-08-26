import Image from "next/image";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-black">
      <Image
        src="/brand/mono-molds-logo.png"
        alt="Mono Molds"
        width={1774}
        height={887}
        priority
        className="h-auto w-full max-w-xl"
      />
      <h1 className="mt-10 text-3xl font-semibold tracking-tight sm:text-5xl">
        Sklep
      </h1>
    </main>
  );
}
