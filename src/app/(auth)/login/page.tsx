import { AuthForm } from "../../../../components/auth/AuthForm";
import "../auth.css";
import { QuadrantMark } from "../../../../components/brand/QuadrantMark";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F2] px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center">
          <QuadrantMark size={40} className="mb-3.5" />
          <span className="font-serif text-lg font-semibold text-[#1F2937]">
            Quadrant
          </span>
        </div>

        <AuthForm />
      </div>
    </div>
  );
}
