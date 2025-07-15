import { useState, useEffect } from "react";
import { IoClose, IoSettingsSharp } from "react-icons/io5";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { MdMinimize } from "react-icons/md";
import { FiUpload, FiDownload } from "react-icons/fi";
import { RiFileExcel2Line } from "react-icons/ri";
import { LuRefreshCw } from "react-icons/lu";
import { useNavigate } from "react-router-dom";

function Settings() {
  const validationSchema = yup.object().shape({
    event_name: yup.string().required("Field cannot be left empty"),
    main_prize_count: yup
      .number()
      .min(1, "Value must be greater than or equal to 1")
      .required("Field cannot be left empty")
      .transform((value, originalValue) => {
        return String(originalValue).trim() === "" ? undefined : value;
      }),
    consolation_prize_count: yup
      .number()
      .min(1, "Value must be greater than or equal to 1")
      .required("Field cannot be left empty")
      .transform((value, originalValue) => {
        return String(originalValue).trim() === "" ? undefined : value;
      }),
    total_digits: yup
      .number()
      .min(3, "Value must be greater than or equal to 3")
      .required("Field cannot be left empty")
      .transform((value, originalValue) => {
        return String(originalValue).trim() === "" ? undefined : value;
      })
      .test(
        "digits_range_max_length",
        "Digits should be greater than or equal to Range Lengths",
        function (value) {
          let { max_range, min_range } = this.parent;
          let max_length = String(max_range).length;
          let min_length = String(min_range).length;
          return max_length <= value && min_length <= value;
        },
      ),
    min_range: yup
      .number()
      .required("Field cannot be left empty")
      .transform((value, originalValue) => {
        return String(originalValue).trim() === "" ? undefined : value;
      })
      .test(
        "is-less",
        "From value must be less than To value",
        function (value) {
          return value < this.parent.max_range;
        },
      ),
    max_range: yup
      .number()
      .required("Field cannot be left empty")
      .transform((value, originalValue) => {
        return String(originalValue).trim() === "" ? undefined : value;
      })
      .test(
        "is-greater",
        "To value must be greater than From value",
        function (value) {
          let { min_range } = this.parent;
          return value > min_range;
        },
      ),
  });
  const navigate = useNavigate();
  const [couponIntegrityStatus, setCouponIntegrityStatus] = useState(false);
  const [couponCount, setCouponCount] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    trigger,
  } = useForm({
    resolver: yupResolver(validationSchema),
    mode: "onChange",
  });

  async function handleCouponCount(){
    setCouponCount(await window.api.couponCount());
  }
  function handleMinimize() {
    window.api.appMinimize().then();
  }

  function handleClose() {
    window.api.appClose().then();
  }

  async function onSubmit(data) {
    await window.api.saveSettings(data);
    await handleLoadInventory();
  }

  const handleMinRangeChange = async (e) => {
    await register("min_range").onChange(e);
    await trigger("max_range");
    await trigger("total_digits");
  };
  const handleMaxRangeChange = async (e) => {
    await register("max_range").onChange(e);
    await trigger("min_range");
    await trigger("total_digits");
  };
  const handleDigitsDependentChange = async (e) => {
    await register("total_digits").onChange(e);
  };
  const handleLoadInventory = async () => {
    const result = await window.api.loadCouponInventory();
    if (result) {
      setCouponIntegrityStatus(true);
    } else {
      setCouponIntegrityStatus(false);
    }
    await handleCouponCount();
  };
  const handleDrawScreen = async () => {
    if (couponIntegrityStatus) {
      const isNavigationAllowed = await window.api.isNavigationAllowed();
      if (isNavigationAllowed) {
        navigate("/main");
      }
    } else {
      await window.api.alertFalseIntegrity();
    }
  };

  useEffect(() => {
    async function preFetchRequirements() {
      const requirements = await window.api.getRequirements();
      setValue("event_name", requirements["event_name"]);
      setValue(
        "consolation_prize_count",
        requirements["consolation_prize_count"],
      );
      setValue("total_digits", requirements["total_digits"]);
      setValue("min_range", requirements["min_range"]);
      setValue("max_range", requirements["max_range"]);
      setValue("main_prize_count", requirements["main_prize_count"]);
    }

    preFetchRequirements().then();
  }, []);

  return (
    <main className="w-screen h-screen p-12 flex flex-col items-center gap-8 bg-gray-100">
      <div
        className={
          "absolute top-6 right-3 w-full h-2 flex flex-row justify-end items-center gap-1"
        }
      >
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
      </div>
      <header className={"w-full flex flex-row gap-2 items-center justify-start"}>
        <IoSettingsSharp size={"1.8rem"} color={"black"} />
        <h2 className={"font-poppins font-bold text-2xl"}>Settings</h2>
      </header>
      <form className={"w-[90%] h-full flex flex-row justify-between gap-14"} onSubmit={handleSubmit(onSubmit)}>
        <section
          className={
            "w-full flex flex-col gap-3 rounded-lg"
          }
        >
          <div className={"h-full flex flex-col gap-5 bg-white p-8 rounded-lg border-1 border-gray-200"}>
            <h2 className={"font-open text-xl font-bold"}>
              Coupon Configuration
            </h2>
            <section className={"flex flex-col gap-8"}>
              <div className={"flex flex-col gap-1"}>
                <label
                  className={
                    "font-open font-semibold text-[0.85rem] text-gray-700"
                  }
                >
                  Name of Event
                </label>
                <input
                  type={"text"}
                  {...register("event_name")}
                  className={
                    "p-2 px-3 font-work font-medium bg-gray-50 rounded-sm border-1 border-gray-400 text-gray-800"
                  }
                />
                <p className={"text-xs font-open font-bold text-red-800"}>
                  {errors?.event_name?.message || ""}
                </p>
              </div>
              <div className={"flex flex-col gap-1"}>
                <label
                  className={
                    "font-open font-semibold text-[0.85rem] text-gray-700"
                  }
                >
                  Maximum Length of Numbers
                </label>
                <input
                  type={"text"}
                  {...register("total_digits")}
                  onChange={handleDigitsDependentChange}
                  className={
                    "p-2 px-3 font-work font-medium bg-gray-50 rounded-sm border-1 border-gray-400 text-gray-800"
                  }
                />
                <p className={"text-xs font-open font-bold text-red-800"}>
                  {errors?.total_digits?.message || ""}
                </p>
              </div>
              <div className={"flex flex-col gap-1"}>
                <label className={"font-open font-bold text-[0.95rem] text-black"}>Range of Numbers</label>
                <div className={"flex flex-row justify-stretch gap-8"}>
                  <div className={"w-full flex flex-col gap-1"}>
                    <label
                      className={
                        "font-open font-semibold text-[0.85rem] text-gray-700"
                      }
                    >
                      From
                    </label>
                    <input
                      type={"number"}
                      {...register("min_range")}
                      onChange={handleMinRangeChange}
                      className={
                        "p-2 px-3 font-work font-medium bg-gray-50 rounded-sm border-1 border-gray-400 text-gray-800"
                      }
                    />
                    <p className={"text-xs font-open font-bold text-red-800"}>
                      {errors?.min_range?.message || ""}
                    </p>
                  </div>
                  <div className={"w-full flex flex-col gap-1"}>
                    <label
                      className={
                        "font-open font-semibold text-[0.85rem] text-gray-700"
                      }
                    >
                      To
                    </label>
                    <input
                      type={"number"}
                      {...register("max_range")}
                      onChange={handleMaxRangeChange}
                      className={
                        "p-2 px-3 font-work font-medium bg-gray-50 rounded-sm border-1 border-gray-400 text-gray-800"
                      }
                    />
                    <p className={"text-xs font-open font-bold text-red-800"}>
                      {errors?.max_range?.message || ""}
                    </p>
                  </div>
                </div>
              </div>
              <div className={"flex flex-col gap-1"}>
                <label className={"font-open font-bold text-[0.95rem] text-black"}>Prize Configuration</label>
                <div className={"flex flex-row justify-stretch gap-8"}>
                  <div className={"w-full flex flex-col gap-1"}>
                    <label
                      className={
                        "font-open font-semibold text-[0.85rem] text-gray-700"
                      }
                    >
                      Total Main Prizes
                    </label>
                    <input
                      type={"number"}
                      {...register("main_prize_count")}
                      className={
                        "p-2 px-3 font-work font-medium bg-gray-50 rounded-sm border-1 border-gray-400 text-gray-800"
                      }
                    />
                    <p className={"text-xs font-open font-bold text-red-800"}>
                      {errors?.main_prize_count?.message || ""}
                    </p>
                  </div>
                  <div className={"w-full flex flex-col gap-1"}>
                    <label
                      className={
                        "font-open font-semibold text-[0.85rem] text-gray-700"
                      }
                    >
                      Total Consolation Prizes
                    </label>
                    <input
                      type={"number"}
                      {...register("consolation_prize_count")}
                      className={
                        "p-2 px-3 font-work font-medium bg-gray-50 rounded-sm border-1 border-gray-400 text-gray-800"
                      }
                    />
                    <p className={"text-xs font-open font-bold text-red-800"}>
                      {errors?.consolation_prize_count?.message || ""}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
        <section className={"w-[40%] flex flex-col gap-6"}>
          <section
            className={
              "p-6 h-full bg-white rounded-lg border-1 border-gray-200 flex flex-col gap-4"
            }
          >
            <h2 className={"font-open font-bold text-xl"}>Coupon Inventory</h2>
            <div className={"flex flex-row justify-between items-center"}>
              <h4 className={"font-open font-semibold text-sm"}>Coupons Loaded and Verified?</h4>
              <div
                className={`font-open font-semibold text-xs p-1 px-4 rounded-full flex flex-row justify-center items-center border-1 text-white ${(couponIntegrityStatus) ? "bg-green-600" : "bg-red-600"} border-${(couponIntegrityStatus) ? "green-600" : "red-600"}`}>{(couponIntegrityStatus) ? "Valid" : "Invalid"}</div>
            </div>
            <div className={"flex flex-col items-stretch gap-3"}>
              <button
                onClick={handleLoadInventory}
                type={"button"}
                className={"p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"}>
                <LuRefreshCw size={"1rem"} color={"black"} />
                Reload Inventory
              </button>
              <button
                type={"button"}
                onClick={async ()=>{await window.api.openExcelFile()}}
                className={"p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"}>
                <RiFileExcel2Line size={"1rem"} color={"black"} />
                Open Excel Workbook
              </button>
              <button
                type={"button"}
                onClick={async ()=>{await window.api.loadExcelFile()}}
                className={"p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"}>
                <FiDownload size={"1rem"} color={"black"} />
                Import Data
              </button>
              <button
                type={"button"}
                onClick={async ()=>{await window.api.browseExcelFile()}}
                className={"p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"}>
                <FiUpload size={"1rem"} color={"black"} />
                Upload Excel Data
              </button>
            </div>
          </section>
          <section
            className={
              "p-6 h-full bg-white rounded-lg border-1 border-gray-200 flex flex-col justify-stretch gap-3"
            }
          >
            <header>
              <h3 className={"font-open font-bold text-xl"}>Backend Status</h3>
            </header>
            <section className={"h-full flex flex-col gap-3"}>
              <div className={"flex flex-row justify-between items-center"}>
                <h4 className={"font-open font-normal text-sm"}>Total Coupons Loaded</h4>
                <div
                  className={`font-open font-normal text-md`}>{couponCount}/60,000
                </div>
              </div>
              <button
                type={"button"}
                onClick={() => {
                  navigate("/report");
                }}
                className={"w-full p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"}>
                Open Activity Logs
              </button>
            </section>
            <div className={"flex flex-col justify-end gap-3"}>
              <button
                type={"submit"}
                className={"w-full p-3 rounded-md bg-blue-900 font-dm text-white font-semibold text-sm transition-all duration-200 cursor-pointer hover:bg-blue-800"}>
                Save Configuration
              </button>
              <button
                type={"button"}
                onClick={handleDrawScreen}
                className={"w-full p-3 rounded-md bg-rose-900 font-dm text-white font-semibold text-sm transition-all duration-200 cursor-pointer hover:bg-rose-800"}>
                Draw Screen
              </button>
            </div>
          </section>
        </section>
      </form>
    </main>
  );
}

export default Settings;
