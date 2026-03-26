// TODO: [개발용] / 진입 시 /graph 로 자동 이동 - 배포 전 제거할 것
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/graph");
}
