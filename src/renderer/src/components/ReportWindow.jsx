import { useState, useEffect } from "react";
import { MdMinimize } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

function ReportWindow() {
  let validationSchema = yup.object().shape({
    fromDate: yup.string().required("From Date is required!"),
    toDate: yup
      .string()
      .required("To Date is required!")
      .test(
        "is-greater-than-from-date",
        "To Date must be greater than or equal to From Date",
        function (value) {
          const { fromDate } = this.parent;
          if (!fromDate || !value) return true;
          return new Date(value) >= new Date(fromDate);
        },
      ),
  });
  const [activityLog, setActivityLog] = useState([]);
  const [isWindowReady, setIsWindowReady] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(validationSchema),
  });

  useEffect(() => {
    setIsWindowReady(true);
  }, []); // Runs only once on component mount

  async function onSubmit(data) {
    setIsWindowReady(false);
    try {
      if (!errors?.toDate?.message) {
        const result = await window.api.getFilteredActivityLog(data);
        setActivityLog(result);
      }
    } catch (error) {
      console.error("Filter error:", error);
    } finally {
      setIsWindowReady(true);
    }
  }
  function handleMinimize() {
    window.api.appMinimize().then();
  }
  // eslint-disable-next-line react/prop-types
  function TableData({ value = "" }) {
    return <td className={`text-xs font-bold font-dm`}>{value}</td>;
  }

  if (isWindowReady) {
    return (
      <main className={"w-screen h-screen p-8"}>
        <div
          className={
            "absolute right-3 w-full h-2 flex flex-row justify-end items-center gap-1"
          }
        >
          <button
            type={"button"}
            className={
              "cursor-pointer p-1 px-2 text-xs text-white font-semibold bg-neutral-800 rounded-md hover:bg-neutral-700 transition-all duration-200"
            }
            onClick={() => {
              navigate("/settings");
            }}
          >
            Go Back
          </button>
          <button
            type={"button"}
            className={"p-1 rounded-md bg-yellow-500 cursor-pointer"}
            onClick={handleMinimize}
          >
            <MdMinimize size={"1.2rem"} color={"black"} />
          </button>
        </div>
        <header>
          <h1 className={"font-poppins text-3xl font-bold text-orange-900"}>
            Events Report
          </h1>
        </header>
        <section className={"flex flex-col gap-6"}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className={
              "p-6 flex flex-row justify-center items-center gap-2 border-1 border-gray-300 rounded-xl"
            }
          >
            <div className={"flex flex-row gap-2 justify-center items-center"}>
              <label className={"font-semibold font-open text-sm"}>
                From Date
              </label>
              <input
                type={"date"}
                {...register("fromDate")}
                className={
                  "p-1 px-2 font-open font-medium text-md text-green-800 bg-green-50 border-1 border-green-600 rounded-lg"
                }
              />
            </div>
            <div
              className={"mr-6 flex flex-row gap-2 justify-center items-center"}
            >
              <label className={"font-semibold font-open text-sm"}>
                To Date
              </label>
              <input
                type={"date"}
                {...register("toDate")}
                className={
                  "p-1 px-2 font-open font-medium text-md text-green-800 bg-green-50 border-1 border-green-600 rounded-lg"
                }
              />
            </div>
            <div>
              <button
                type={"submit"}
                className={
                  "bg-red-800 rounded-lg p-2 px-4 font-open text-xs text-white font-semibold cursor-pointer"
                }
              >
                Get Data
              </button>
            </div>
            <p className={"text-xs font-semibold text-red-700 font-open"}>
              {errors?.toDate?.message}
            </p>
          </form>
          <section
            className={
              "h-full flex flex-row justify-center items-center overflow-y-scroll"
            }
          >
            <table className={"w-full h-full table-auto"}>
              <tbody className={"w-full rounded-lg"}>
                <tr className={"h-8 bg-slate-200"}>
                  <th className={"text-xs font-bold font-open text-slate-700"}>
                    SNo
                  </th>
                  <th className={"text-xs font-bold font-open text-slate-700"}>
                    Event Name
                  </th>
                  <th className={"text-xs font-bold font-open text-slate-700"}>
                    Run Date
                  </th>
                  <th className={"text-xs font-bold font-open text-slate-700"}>
                    User ID
                  </th>
                  <th className={"text-xs font-bold font-open text-slate-700"}>
                    User Name
                  </th>
                </tr>
                {activityLog.map((activity, index) => {
                  return (
                    <tr
                      key={`${index}`}
                      className={"h-10 text-center border-b-1 border-black"}
                    >
                      <TableData value={(index + 1).toString()} />
                      <TableData value={activity.Event_Name} />
                      <TableData value={activity.run_dt} />
                      <TableData value={activity.run_usr_id} />
                      <TableData value={activity.User_Name} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </section>
      </main>
    );
  } else {
    return (
      <main
        className={
          "w-screen h-screen flex flex-row justify-center items-center"
        }
      >
        <h2 className={"text-3xl font-open font-bold text-gray-500"}>
          Waiting for data...
        </h2>
      </main>
    );
  }
}

export default ReportWindow;
