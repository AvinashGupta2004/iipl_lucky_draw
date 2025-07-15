import { useState, useEffect } from "react";
import { IoClose, IoSettingsSharp } from "react-icons/io5";
import { MdMinimize } from "react-icons/md";
import { useNavigate } from "react-router-dom";

function ReportWindow() {
  const [activityLog, setActivityLog] = useState(null);
  const [isWindowReady, setIsWindowReady] = useState(false);
  const navigate = useNavigate();

  function handleMinimize() {
    window.api.appMinimize().then();
  }

  function handleClose() {
    window.api.appClose().then();
  }

  function TableData({ value = "" }) {
    return <td className={`text-xs font-bold font-dm`}>{value}</td>;
  }
  useEffect(() => {
    window.api.getActivityLog().then((result) => {
      setActivityLog(result);
      setIsWindowReady(true);
    });
  });

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
            className={"cursor-pointer"}
            onClick={() => {
              navigate("/settings");
            }}
          >
            <IoSettingsSharp color={"black"} size={"1.2rem"} />
          </button>
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
        <header>
          <h1
            className={"mb-6 font-poppins text-3xl font-bold text-orange-900"}
          >
            Events Report
          </h1>
        </header>
        <section className={"flex flex-col gap-6"}>
          <form
            className={
              "p-6 flex flex-row justify-center items-center border-1 border-gray-300 rounded-xl"
            }
          >
            <div
              className={"mr-6 flex flex-row gap-2 justify-center items-center"}
            >
              <label className={"font-semibold font-open text-sm"}>
                From Date
              </label>
              <input
                type={"date"}
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
          </form>
          <section className={"flex flex-row justify-center items-center"}>
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
                    Activities
                  </th>
                </tr>
                {activityLog.map((activity, index) => {
                  return (
                    <tr
                      key={`${index}`}
                      className={"h-10 text-center border-b-1 border-black"}
                    >
                      <TableData value={activity.activity_id} />
                      <TableData value={activity.usr_id} />
                      <TableData value={activity.run_dt} />
                      <TableData value={activity.desc} />
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
