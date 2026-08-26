import { AuthForm } from "../../../../components/auth/AuthForm";
import "../auth.css";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F2] px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3.5 grid h-9 w-9 grid-cols-2 grid-rows-2 gap-1">
            <span className="rounded-[4px] bg-[#F3F4F6]" />
            <span className="rounded-[4px] bg-[#F97316]" />
            <span className="rounded-[4px] bg-[#F3F4F6]" />
            <span className="rounded-[4px] bg-[#F3F4F6]" />
          </div>
          <span className="font-serif text-lg font-semibold text-[#1F2937]">
            Quadrant
          </span>
        </div>

        <AuthForm />
      </div>
    </div>
  );
}
