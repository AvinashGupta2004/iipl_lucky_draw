import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import { MdMinimize } from "react-icons/md";
import IndoramaLogo from "../../src/assets/indoramalogo.png";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

function RegistrationForm() {
  let validationSchema = yup.object().shape({
    userName: yup.string().required("User Name is required"),
    userPassword: yup.string().required("Password is required"),
    confirmUserPassword: yup
      .string()
      .required("Confirm Password cannot be left Empty")
      .test(
        "confirmPassword",
        "Password cannot be different",
        function (value) {
          let { userPassword } = this.parent;
          return value === userPassword;
        },
      ),
  });

  const { register, handleSubmit, formState:{errors} } = useForm({
    mode: "onChange",
    resolver: yupResolver(validationSchema),
  });
  const navigate = useNavigate();
  function handleClose() {
    window.api.appClose().then();
  }
  function handleMinimize() {
    window.api.appMinimize().then();
  }
  async function onSubmit(data) {
    await window.api.registerUser(data);
  }
  return (
    <main className="w-screen h-screen flex flex-row justify-center items-center relative">
      <section className={"absolute right-[5%] top-[5%] flex flex-row gap-2"}>
        <button
          className={"p-1 rounded-md bg-red-700 cursor-pointer"}
          onClick={handleClose}
        >
          <IoClose size={"1.2rem"} color={"white"} />
        </button>
        <button
          className={"p-1 rounded-md bg-yellow-500 cursor-pointer"}
          onClick={handleMinimize}
        >
          <MdMinimize size={"1.2rem"} color={"black"} />
        </button>
      </section>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={
          "p-10 w-[40%] lg:w-[30%] border-1 border-neutral-300 rounded-2xl flex flex-col gap-8"
        }
      >
        <div>
          <img
            src={IndoramaLogo}
            className={"aspect-auto h-8 mx-auto"}
            alt={"Indorama Image"}
          />
          <h1 className={"mt-1 font-bold font-open text-[1.5rem] text-center"}>
            Create an Account
          </h1>
        </div>
        <div className={"flex flex-col gap-4"}>
          <div>
            <label
              className={"font-open font-semibold text-[0.75rem] text-gray-600"}
            >
              Your Name
            </label>
            <input
              type={"text"}
              className={
                "w-full h-10 mt-0.5 bg-gray-50 font-work px-3 font-normal text-md rounded-lg border-1 border-neutral-300 focus:outline-blue-600"
              }
              {...register("userName")}
            />
          </div>
          <div>
            <label
              className={"font-open font-semibold text-[0.75rem] text-gray-600"}
            >
              Your Password
            </label>
            <input
              type={"password"}
              className={
                "w-full h-10 mt-0.5 bg-gray-50 font-work px-3 font-normal text-md rounded-lg border-1 border-neutral-300 focus:outline-blue-600"
              }
              {...register("userPassword")}
            />
          </div>
          <div>
            <label
              className={"font-open font-semibold text-[0.75rem] text-gray-600"}
            >
              Confirm Password
            </label>
            <input
              type={"password"}
              className={
                "w-full h-10 mt-0.5 bg-gray-50 font-work px-3 font-normal text-md rounded-lg border-1 border-neutral-300 focus:outline-blue-600"
              }
              {...register("confirmUserPassword")}
            />
            <p
              className={
                "h-[0.8rem] font-dm font-medium text-[0.8rem] text-red-700"
              }
            >
              {errors.event_name ? errors.event_name.message : ""}
            </p>
          </div>
        </div>
        <div className={"flex flex-col gap-2"}>
          <button
            type={"submit"}
            className={
              "w-full h-10 rounded-lg bg-blue-700 text-white text-sm font-open font-semibold tracking-wide cursor-pointer hover:bg-blue-600 transition-all duration-200"
            }
          >
            Submit
          </button>
        </div>
        <div className={"text-center font-normal"}>
          <label>
            Already a Member?{" "}
            <button
              type={"button"}
              onClick={() => {
                navigate("/sign-in");
              }}
              className={
                "text-blue-700 cursor-pointer text-md font-medium font-work"
              }
            >
              Sign in
            </button>
          </label>
        </div>
      </form>
    </main>
  );
}

export default RegistrationForm;
