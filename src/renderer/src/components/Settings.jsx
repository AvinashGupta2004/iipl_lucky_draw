import { useState, useEffect } from "react";
import { IoSettingsSharp } from "react-icons/io5";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { MdMinimize, MdDashboardCustomize } from "react-icons/md";
import { FiUpload, FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

function Settings() {
  function createCouponSufficiencyTest() {
    return function (value, context) {
      const {
        min_range,
        max_range,
        main_prize_count,
        consolation_prize_count,
      } = context.parent;

      // If any required field is missing, skip validation
      if (
        min_range === undefined ||
        max_range === undefined ||
        main_prize_count === undefined ||
        consolation_prize_count === undefined
      ) {
        return true;
      }

      const totalPrizes =
        Number(main_prize_count) + Number(consolation_prize_count);
      const totalCoupons = max_range - min_range + 1;

      return totalCoupons >= totalPrizes;
    };
  }

  const couponSufficiencyTest = createCouponSufficiencyTest();
  const validationSchema = yup.object().shape({
    event_name: yup.string().required("Field cannot be left empty"),
    main_prize_count: yup
      .number()
      .min(1, "Value must be greater than or equal to 1")
      .required("Field cannot be left empty")
      .transform((value, originalValue) => {
        return String(originalValue).trim() === "" ? undefined : value;
      })
      .test(
        "sufficient-coupons",
        "Not enough coupons in range for all prizes",
        couponSufficiencyTest,
      ),
    consolation_prize_count: yup
      .number()
      .min(1, "Value must be greater than or equal to 1")
      .required("Field cannot be left empty")
      .transform((value, originalValue) => {
        return String(originalValue).trim() === "" ? undefined : value;
      })
      .test(
        "sufficient-coupons",
        "Not enough coupons in range for all prizes",
        couponSufficiencyTest,
      ),
    total_digits: yup
      .number()
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
          return max_length === value && min_length <= value;
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
      )
      .test(
        "sufficient-coupons",
        "Range doesn't contain enough coupons for all prizes",
        couponSufficiencyTest,
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
      )
      .test(
        "sufficient-coupons",
        "Range doesn't contain enough coupons for all prizes",
        couponSufficiencyTest,
      ),
  });
  const triggerCouponValidation = async () => {
    await trigger([
      "min_range",
      "max_range",
      "main_prize_count",
      "consolation_prize_count",
    ]);
  };
  const navigate = useNavigate();
  const [couponIntegrityStatus, setCouponIntegrityStatus] = useState(false);
  const [couponCount, setCouponCount] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    trigger,
    watch,
  } = useForm({
    resolver: yupResolver(validationSchema),
    mode: "onChange",
  });

  function handleMinimize() {
    window.api.appMinimize().then();
  }

  function handleLogout() {
    navigate("/sign-in");
  }

  function handleReset() {
    setCouponIntegrityStatus(false);
    setValue("event_name", "");
    setValue("total_digits", "");
    setValue("main_prize_count", "");
    setValue("consolation_prize_count", "");
    setValue("min_range", "");
    setValue("max_range", "");
  }
  // async function onSubmit(data) {
  //   data = {
  //     event_name: data.event_name.toString().trim(),
  //     total_digits: data.total_digits.toString().trim(),
  //     main_prize_count: data.main_prize_count.toString().trim(),
  //     consolation_prize_count: data.consolation_prize_count.toString().trim(),
  //     min_range: data.min_range,
  //     max_range: data.max_range,
  //   };
  //   await window.api.saveSettings(data);
  //   let result = await window.api.browseExcelFile();
  //   if (result.success) {
  //     result = await window.api.loadExcelFile();
  //   }
  //   if (result.success) {
  //     result = await handleLoadInventory();
  //     // if (!result) {
  //     //   handleReset();
  //     // }
  //   }
  // }
  async function onSubmit(data) {
    let coupons = 0;
    try {
      data = {
        event_name: data.event_name.toString().trim(),
        total_digits: data.total_digits,
        main_prize_count: data.main_prize_count,
        consolation_prize_count: data.consolation_prize_count,
        min_range: data.min_range,
        max_range: data.max_range,
      };
      // Save settings first
      const saveResult = await window.api.saveSettings(data);
      if (!saveResult) {
        throw new Error("Failed to save settings");
      }

      // Browse and load Excel file
      const browseResult = await window.api.browseExcelFile();
      if (!browseResult.success) {
        throw new Error("Failed to select Excel file");
      }

      const loadResult = await window.api.loadExcelFile();
      if (!loadResult.success) {
        throw new Error("Failed to load Excel file");
      }

      // Load and validate inventory
      const inventoryResult = await handleLoadInventory();
      if (!inventoryResult.success) {
        throw new Error("Coupon validation failed");
      }
      coupons = inventoryResult.couponCount;
      const sufficiencyResult = () => {
        return (
          data.main_prize_count + data.consolation_prize_count <=
          inventoryResult.couponCount
        );
      };
      if (!sufficiencyResult()) {
        throw new Error(
          "Coupon Numbers not sufficient for given number of Prizes!",
        );
      }
      setCouponIntegrityStatus(true);
      return true;
    } catch (error) {
      console.error("Submission error:", error);
      // Reset form on error
      await window.api.errorDialog(
        error.message,
        data.main_prize_count + data.consolation_prize_count,
        coupons,
      );
      setCouponIntegrityStatus(false);
      return false;
    }
  }

  const handleLoadInventory = async () => {
    try {
      const result = await window.api.loadCouponInventory();
      if (!result) {
        throw new Error(result.error || "Coupon validation failed");
      }

      const count = await window.api.couponCount();
      if (count === 0) {
        throw new Error("No valid coupons loaded");
      }
      setCouponCount(count);
      return { success: true, couponCount: count };
    } catch (error) {
      console.error("Inventory load error:", error);
      setCouponCount(0);
      return { success: false, couponCount: 0 };
    }
  };
  // const handleMinRangeChange = async (e) => {
  //   await register("min_range").onChange(e);
  //   await trigger("max_range");
  //   await trigger("total_digits");
  // };
  // const handleMaxRangeChange = async (e) => {
  //   await register("max_range").onChange(e);
  //   await trigger("min_range");
  //   await trigger("total_digits");
  // };
  const handleDigitsDependentChange = async (e) => {
    await register("total_digits").onChange(e);
    await triggerCouponValidation();
  };
  const handleMinRangeChange = async (e) => {
    await register("min_range").onChange(e);
    await triggerCouponValidation();
    await trigger("total_digits");
  };

  const handleMaxRangeChange = async (e) => {
    await register("max_range").onChange(e);
    await triggerCouponValidation();
    await trigger("total_digits");
  };

  const handleMainPrizeChange = async (e) => {
    await register("main_prize_count").onChange(e);
    await triggerCouponValidation();
  };

  const handleConsolationPrizeChange = async (e) => {
    await register("consolation_prize_count").onChange(e);
    await triggerCouponValidation();
  };
  // const handleLoadInventory = async () => {
  //   const result = await window.api.loadCouponInventory();
  //   if (result && couponCount.length !== 0) {
  //     setCouponIntegrityStatus(true);
  //   } else {
  //     setCouponIntegrityStatus(false);
  //   }
  //   await handleCouponCount();
  // };
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
    watch((value, { name }) => {
      if (
        name &&
        [
          "min_range",
          "max_range",
          "main_prize_count",
          "consolation_prize_count",
        ].includes(name)
      ) {
        triggerCouponValidation().then();
      }
    });
  }, [watch, trigger]);

  return (
    <main className="w-screen h-screen p-12 flex flex-col items-center gap-8 bg-gray-100">
      <div
        className={
          "absolute top-6 right-3 w-full h-2 flex flex-row justify-end items-center gap-1"
        }
      >
        <button
          className={
            "p-1 rounded-md bg-red-700 cursor-pointer px-2 text-xs font-open font-semibold text-white"
          }
          onClick={handleLogout}
        >
          Logout
        </button>
        <button
          className={"p-1 rounded-md bg-yellow-500 cursor-pointer"}
          onClick={handleMinimize}
        >
          <MdMinimize size={"1.2rem"} color={"black"} />
        </button>
      </div>
      <header
        className={"w-full flex flex-row gap-2 items-center justify-start"}
      >
        <IoSettingsSharp size={"1.8rem"} color={"black"} />
        <h2 className={"font-poppins font-bold text-2xl"}>Settings</h2>
      </header>
      <form
        className={"w-[90%] flex flex-row justify-between items-stretch gap-14"}
        onSubmit={handleSubmit(onSubmit)}
      >
        <section className={"w-full flex flex-col gap-3 rounded-lg"}>
          <div
            className={
              "h-full flex flex-col gap-5 bg-white p-8 rounded-lg border-1 border-gray-200"
            }
          >
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
                  disabled={couponIntegrityStatus}
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
                  Max Digits in Coupon Numbers
                </label>
                <input
                  type={"text"}
                  disabled={couponIntegrityStatus}
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
                <label
                  className={"font-open font-bold text-[0.95rem] text-black"}
                >
                  Range of Numbers
                </label>
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
                      disabled={couponIntegrityStatus}
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
                      disabled={couponIntegrityStatus}
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
                <label
                  className={"font-open font-bold text-[0.95rem] text-black"}
                >
                  Prize Configuration
                </label>
                <div className={"flex flex-row justify-stretch gap-8"}>
                  <div className={"w-full flex flex-col gap-1"}>
                    <label
                      className={
                        "font-open font-semibold text-[0.85rem] text-gray-700"
                      }
                    >
                      Main Prize Count
                    </label>
                    <input
                      type={"number"}
                      disabled={couponIntegrityStatus}
                      onChange={handleMainPrizeChange}
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
                      Consolation Prize Count
                    </label>
                    <input
                      type={"number"}
                      disabled={couponIntegrityStatus}
                      onChange={handleConsolationPrizeChange}
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
              "p-6 bg-white rounded-lg border-1 border-gray-200 flex flex-col gap-4"
            }
          >
            <h2 className={"font-open font-bold text-xl"}>Coupon Inventory</h2>
            <div className={"flex flex-row justify-between items-center"}>
              <h4 className={"font-open font-semibold text-sm"}>
                Coupons Loaded and Verified?
              </h4>
              <div
                className={`font-open font-semibold text-xs p-1 px-4 rounded-full flex flex-row justify-center items-center border-1 text-white ${couponIntegrityStatus ? "bg-green-600" : "bg-red-600"} border-${couponIntegrityStatus ? "green-600" : "red-600"}`}
              >
                {couponIntegrityStatus ? "Valid" : "Invalid"}
              </div>
            </div>
            <div className={"h-full pt-4 flex flex-col justify-end gap-3"}>
              <button
                type={"submit"}
                className={
                  "w-full p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                }
              >
                <FiUpload size={"1rem"} color={"black"} />
                Select Data File
              </button>
              <button
                type={"button"}
                onClick={handleDrawScreen}
                disabled={!couponIntegrityStatus}
                className={
                  "w-full p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                }
              >
                <MdDashboardCustomize size={"1rem"} color={"black"} />
                Draw Screen
              </button>
              <button
                type={"button"}
                onClick={handleReset}
                className={
                  "w-full p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                }
              >
                <FiRefreshCw size={"1rem"} color={"black"} />
                Reset
              </button>
            </div>
          </section>
          <section
            className={
              "p-6 h-full bg-white rounded-lg border-1 border-gray-200 flex flex-col justify-stretch gap-3"
            }
          >
            <header>
              <h3 className={"font-open font-bold text-xl"}>Draw Run Log</h3>
            </header>
            <section className={"h-full flex flex-col gap-5"}>
              <div className={"flex flex-row justify-between items-center"}>
                <h4 className={"font-open font-normal text-sm"}>
                  Total Coupons Loaded
                </h4>
                <div className={`font-open font-normal text-md`}>
                  {couponCount}
                </div>
              </div>
              <button
                type={"button"}
                onClick={() => {
                  navigate("/report");
                }}
                className={
                  "w-full p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                }
              >
                Open Activity Logs
              </button>
              <button
                type={"button"}
                onClick={async () => {
                  await window.api.selectLeftImage();
                }}
                className={
                  "w-full p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                }
              >
                Select Left Image
              </button>
              <button
                type={"button"}
                onClick={async () => {
                  await window.api.selectRightImage();
                }}
                className={
                  "w-full p-2.5 font-open font-semibold text-sm border-2 border-gray-300 rounded-lg flex flex-row justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                }
              >
                Select Right Image
              </button>
            </section>
          </section>
        </section>
      </form>
    </main>
  );
}

export default Settings;
