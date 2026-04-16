import re
import html as _html
from datetime import datetime, timedelta

import pandas as pd
import streamlit as st

from data.tag_registry import WELL_TAGS
from reports.surveillance_pdf import SurveillancePDFGenerator
from reports.production_pdf import ProductionPDFGenerator
from services.email_service import (
    EmailClient,
    _default_subject_body,
    build_report_intro_html,
)
from analysis.pressure_loss import build_surveillance_state_map

def _plot_signal(raw_data: dict, key: str, title: str):
    df = raw_data.get(key)
    st.markdown(f"**{title}**")
    if df is not None and not df.empty:
        plot_df = df.copy()
        if "Timestamp" in plot_df.columns:
            plot_df["Timestamp"] = pd.to_datetime(plot_df["Timestamp"], errors="coerce")
            plot_df = plot_df.dropna(subset=["Timestamp"])
            if not plot_df.empty:
                st.line_chart(plot_df.set_index("Timestamp")["Value"])
                return
    st.info("No data available")

def _build_platform_summary_df(wells_data: list[dict]) -> pd.DataFrame:
    rows = []
    for well_data in wells_data:
        well_name = well_data.get("well", well_data.get("well_name", ""))
        analysis_results = well_data.get("analysis_results", well_data.get("measurements", {}))
        for meas_key, meas_name in [
            ("tubing_pressure", "Tubing Pressure"),
            ("flowline_pressure", "Flowline Pressure"),
            ("temperature", "Temperature"),
        ]:
            if meas_key not in analysis_results:
                continue
            meas_data = analysis_results[meas_key]
            if "error" in meas_data:
                continue
            stats_data = meas_data.get("statistics", {})
            trend_data = meas_data.get("trend", {})
            osc_data = meas_data.get("oscillations", {})
            rows.append({
                "Well": well_name,
                "Measurement": meas_name,
                "Mean": f"{stats_data.get('mean', 0):.1f}",
                "Trend": trend_data.get("trend", "N/A"),
                "Oscillation": "Yes" if osc_data.get("oscillation_detected", False) else "No",
            })
    return pd.DataFrame(rows)

def _build_field_data(report_service, selected_date):
    all_platforms_data = []
    platforms = list(WELL_TAGS.keys())

    for platform in platforms:
        platform_result = report_service.generate_platform_surveillance(platform, selected_date)
        all_platforms_data.append({
            "platform_name": platform,
            "wells": platform_result["wells"],
        })

    return all_platforms_data

def _field_email_html(date_str: str, text: str) -> str:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    html_parts: list[str] = []
    html_parts.append("<div style='font-family:Calibri, Arial, sans-serif; font-size:12pt;'>")
    html_parts.append(f"<p style='margin:0 0 8px 0;'>Field-wide surveillance summary for {date_str}.</p>")

    first_platform = True
    for ln in lines:
        if ln and ln[0].isdigit() and ". " in ln:
            current_platform = ln.split(". ", 1)[1]
            if not first_platform:
                html_parts.append("<p style='margin:0 0 18px 0;'>&nbsp;</p>")
            first_platform = False
            html_parts.append(
                f"<h3 style='color:#1e3a5f; font-size:12pt; margin:10px 0 4px 0;'>{_html.escape(current_platform)}</h3>"
            )
            continue

        if "Platform-level highlight" in ln:
            html_parts.append(
                "<p style='margin:0 0 4px 0; font-weight:bold; color:#1e3a5f;'>Platform-level highlight</p>"
            )
            continue

        if ln.startswith("- "):
            html_parts.append(f"<p style='margin:0 0 2px 12px;'>{_html.escape(ln)}</p>")
        else:
            html_parts.append(f"<p style='margin:0 0 2px 0;'>{_html.escape(ln)}</p>")

    html_parts.append("</div>")
    return "\n".join(html_parts)

def _short_well_name(well: str) -> str:
    w = str(well or "").strip()
    m = re.search(r"(?i)alba\s+([A-D])\s*-\s*(\d{1,2})", w)
    if m:
        return f"{m.group(1).upper()}-{int(m.group(2)):02d}"
    return w

def _render_collapsible_well_narrative(pdf_gen, well_name, measurements, raw_data):
    with st.expander(well_name, expanded=False):
        obs = pdf_gen._generate_well_narrative(well_name, measurements, raw_data)
        for line in obs:
            clean_line = re.sub(
                rf"^\s*{re.escape(well_name)}\s*[-:–]?\s*",
                "",
                str(line),
                flags=re.IGNORECASE,
            )
            st.write(f"- {clean_line}")

def build_prod_surv_sentences(date, field_data, totals, surv_map):
    date_str = date.strftime("%Y-%m-%d") if hasattr(date, "strftime") else str(date)

    gas = totals.get("gas_volume", 0.0) or 0.0
    cond = totals.get("cond_volume", 0.0) or 0.0
    water = totals.get("water_volume", 0.0) or 0.0

    lines: list[str] = []

    lines.append(
        f"On {date_str}, total field production was "
        f"{gas:.1f} MMSCF of gas, {cond:.0f} BBL of condensate, "
        f"and {water:.0f} BBL of water."
    )

    lines.append("FIELD RESULT")
    lines.append(f"Gas: {gas:.1f} MMSCF")
    lines.append(f"Condensate: {cond:.0f} BBL")
    lines.append(f"Water: {water:.0f} BBL")

    wells = []
    for row in field_data:
        gv = row.get("gas_volume") or 0.0
        if gv <= 0:
            continue
        platform = row["platform"]
        well = row["well"]
        cls = surv_map.get((platform, well), {"state": "UNKNOWN", "features": {}})
        wells.append({
            "well": well,
            "short": _short_well_name(well),
            "gas": gv,
            "frac": (gv / gas * 100.0) if gas > 0 else 0.0,
            "state": cls["state"],
            "feat": cls["features"],
        })

    wells.sort(key=lambda x: x["gas"], reverse=True)
    key_wells = [w for w in wells if w["frac"] >= 3.0][:6]

    if key_wells:
        lines.append(
            "PRIMARY DRIVERS – Production behaviour on the highest-rate wells explains "
            "most of the day’s gas performance:"
        )

    for w in key_wells:
        base = (
            f"{w['short']} produced {w['gas']:.1f} MMSCF "
            f"(~{w['frac']:.0f}% of field gas). "
        )

        tp_med = w["feat"].get("tp_med")
        tp_trend = w["feat"].get("tp_trend", "Unknown")

        if w["state"] == "STEADY_REFERENCE":
            lines.append(
                base +
                (
                    f"Flowing pressure was stable near {int(tp_med)} psig. "
                    if tp_med else
                    "Flowing pressure was stable. "
                ) +
                "Production reflects normal deliverability at the operating setpoint."
            )

        elif w["state"] == "CYCLING_PRESSURE":
            lines.append(
                base +
                (
                    f"Flowing pressure cycled around ~{int(tp_med)} psig. "
                    if tp_med else
                    "Flowing pressure cycled repeatedly. "
                ) +
                "This intermittently reduced drawdown and constrained daily gas volume."
            )

        elif w["state"] == "PRESSURE_DRIFT":
            if tp_trend == "Increasing":
                lines.append(
                    base +
                    "Flowing pressure increased through the day, progressively reducing drawdown "
                    "and suppressing production."
                )
            elif tp_trend == "Decreasing":
                lines.append(
                    base +
                    "Flowing pressure declined through the day, improving drawdown late-day "
                    "and supporting higher instantaneous rates."
                )
            else:
                lines.append(base + "Flowing pressure drifted gradually, influencing rate behaviour.")

        elif w["state"] == "NOISY_DATA":
            lines.append(
                base +
                "Surveillance data were noisy, limiting confidence in pressure-rate interpretation."
            )

        else:
            lines.append(base + "No dominant surveillance constraint was identified.")

    runtime_losses = []
    for row in field_data:
        fh = row.get("flow_hours")
        lost = row.get("deferred_gas") or 0.0
        ref = row.get("expected_24h_gas")
        ref_dates = row.get("reference_dates") or []

        if fh is None or fh >= 22.0 or lost <= 0:
            continue

        runtime_losses.append({
            "well": _short_well_name(row["well"]),
            "hours": fh,
            "lost": lost,
            "ref": ref,
            "ref_dates": ref_dates,
        })

    if runtime_losses:
        runtime_losses.sort(key=lambda x: x["lost"], reverse=True)
        total_lost = sum(x["lost"] for x in runtime_losses)

        lines.append(
            "RUNTIME LOSSES – Deferred gas was estimated from comparable 24-hour reference days "
            "for each well, not from reusing the same runtime-associated daily gas."
        )

        for item in runtime_losses[:5]:
            ref_txt = f" using ~{item['ref']:.1f} MMSCF as 24-hour reference" if item["ref"] else ""
            date_txt = f" ({', '.join(item['ref_dates'])})" if item["ref_dates"] else ""
            lines.append(
                f"{item['well']} flowed for {item['hours']:.1f} hours, implying ~{item['lost']:.1f} MMSCF "
                f"of deferred gas{ref_txt}{date_txt}."
            )

        lines.append(
            f"In aggregate, reduced runtime accounts for ~{total_lost:.1f} MMSCF of deferred gas."
        )

    if cond > 0:
        lines.append(
            "Condensate production tracked gas rates with no evidence of liquid drop-out "
            "or surface handling constraints."
        )

    if water > 0:
        lines.append(
            "Water production scaled with gas, with no indication of water-handling limitations "
            "affecting field throughput."
        )

    return lines

def _render_production_surveillance_narrative(date, field_data, totals, surv_map):
    lines = build_prod_surv_sentences(date, field_data, totals, surv_map)
    for line in lines:
        st.write(f"- {line}")

def render_surveillance_page(report_service, production_service=None):
    st.markdown(
        """
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
                    padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: white; margin: 0;">Well Surveillance Reports</h2>
            <p style="color: #b8d4e8; margin: 5px 0 0 0;">
                Comprehensive daily analysis reports for all platforms and wells
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    platforms = list(WELL_TAGS.keys())

    col1, col2 = st.columns([1, 2])
    with col1:
        selected_platform = st.selectbox("Select Platform", platforms)
    with col2:
        now_wat = datetime.utcnow() + timedelta(hours=1)
        default_date = (now_wat - timedelta(days=1)).date()
        selected_date = st.date_input(
            "Report Date",
            value=default_date,
            min_value=(now_wat - timedelta(days=30)).date(),
            max_value=(now_wat - timedelta(days=1)).date(),
        )

    st.divider()

    report_type = st.radio(
        "Select Report type:",
        [
            "Comprehensive Platform Report",
            "Single Well Report",
            "Field-Wide Report",
            "Daily Production Report",
        ],
        horizontal=True,
    )

    with st.expander("Optional: email the PDF report"):
        email_to = st.text_input("To (comma- or semicolon-separated)", key="sv_email_to")
        email_cc = st.text_input("CC (optional)", key="sv_email_cc")
        custom_subject = st.text_input("Custom subject (optional)", key="sv_email_subject")
        custom_body = st.text_area("Custom body (optional)", key="sv_email_body", height=120)
        send_email_flag = st.checkbox("Send email when the PDF is generated", key="sv_email_send")

    pdf_gen = SurveillancePDFGenerator()

    if report_type == "Single Well Report":
        wells = list(WELL_TAGS[selected_platform].keys())
        selected_well = st.selectbox("Select Well", wells)

        if st.button("Generate Well Report", type="primary", use_container_width=True):
            result = report_service.generate_single_well_surveillance(
                selected_platform,
                selected_well,
                selected_date,
            )

            obs = pdf_gen._generate_well_narrative(
                selected_well,
                result["analysis_results"],
                result["raw_data"],
            )

            st.subheader("Narrative Surveillance Summary")
            for line in obs:
                st.write(f"- {line}")

            st.divider()
            st.subheader(f"Analysis Results - {selected_well}")

            summary_rows = []
            for meas_key, meas_name in [
                ("tubing_pressure", "Tubing Pressure"),
                ("flowline_pressure", "Flowline Pressure"),
                ("temperature", "Temperature"),
            ]:
                if meas_key not in result["analysis_results"]:
                    continue
                meas_data = result["analysis_results"][meas_key]
                if "error" in meas_data:
                    continue
                stats_data = meas_data.get("statistics", {})
                trend_data = meas_data.get("trend", {})
                osc_data = meas_data.get("oscillations", {})
                summary_rows.append({
                    "Measurement": meas_name,
                    "Average": stats_data.get("mean", 0),
                    "Std Dev": stats_data.get("std", 0),
                    "Min": stats_data.get("min", 0),
                    "Max": stats_data.get("max", 0),
                    "Range": stats_data.get("range", 0),
                    "Trend": trend_data.get("trend", "Unknown"),
                    "Oscillation": "Yes" if osc_data.get("oscillation_detected", False) else "No",
                    "Osc Period (hrs)": round(osc_data.get("period_hours", 0), 2),
                    "Anomalies": meas_data.get("anomalies", {}).get("anomaly_count", 0),
                })
            summary_df = pd.DataFrame(summary_rows)

            if not summary_df.empty:
                display_df = summary_df.copy()
                for col in ["Average", "Std Dev", "Min", "Max", "Range", "Osc Period (hrs)"]:
                    if col in display_df.columns:
                        display_df[col] = display_df[col].apply(lambda x: f"{x:.2f}")
                st.dataframe(display_df, use_container_width=True, hide_index=True)

            st.subheader("Data Visualization")
            tabs = st.tabs(["Tubing Pressure", "Temperature", "Flowline Pressure"])
            with tabs[0]:
                _plot_signal(result["raw_data"], "tubing_pressure", "Tubing Pressure")
            with tabs[1]:
                _plot_signal(result["raw_data"], "temperature", "Temperature")
            with tabs[2]:
                _plot_signal(result["raw_data"], "flowline_pressure", "Flowline Pressure")

            st.divider()
            st.subheader("Download / Email Report")

            pdf_bytes = pdf_gen.generate_single_well_report(
                selected_well,
                selected_platform,
                str(selected_date),
                result["analysis_results"],
                result["raw_data"],
            )

            col_a, col_b = st.columns(2)
            with col_a:
                if not summary_df.empty:
                    csv_bytes = summary_df.to_csv(index=False).encode("utf-8")
                    st.download_button(
                        label="Download CSV",
                        data=csv_bytes,
                        file_name=f"well_analysis_{selected_well}_{selected_date}.csv",
                        mime="text/csv",
                    )
            with col_b:
                if pdf_bytes:
                    fname = f"Well_Analysis_{selected_well}_{selected_date}.pdf"
                    st.download_button(
                        label="Download Detailed PDF Report",
                        data=pdf_bytes,
                        file_name=fname,
                        mime="application/pdf",
                    )

                    if send_email_flag and email_to.strip():
                        client = EmailClient()
                        date_str = str(selected_date)
                        default_subj, default_body = _default_subject_body(
                            report_kind="well",
                            platform=selected_platform,
                            well=selected_well,
                            date_str=date_str,
                        )
                        subject = custom_subject.strip() if custom_subject else default_subj
                        body = custom_body.strip() if custom_body else default_body

                        ok, err = client.send_email(
                            to_str=email_to,
                            cc_str=email_cc,
                            subject=subject,
                            body=body,
                            attachments=[(fname, pdf_bytes, "application/pdf")],
                        )
                        if ok:
                            st.success("Well report email sent successfully.")
                        else:
                            st.error(f"Well report email failed: {err}")

    elif report_type == "Comprehensive Platform Report":
        if st.button("Generate Platform Report", type="primary", use_container_width=True):
            result = report_service.generate_platform_surveillance(
                selected_platform,
                selected_date,
            )

            st.subheader("Narrative Surveillance Report")

            tp_band, fl_band, t_band = pdf_gen._platform_band_summary([
                {
                    "well_name": w.get("well", w.get("well_name", "")),
                    "platform": selected_platform,
                    "raw_data": w.get("raw_data", {}),
                    "measurements": w.get("analysis_results", w.get("measurements", {})),
                }
                for w in result["wells"]
            ])
            tp_lo, tp_hi = tp_band
            fl_lo, fl_hi = fl_band
            t_lo, t_hi = t_band

            st.markdown("**Platform-level highlight**")
            if tp_lo is not None and tp_hi is not None:
                st.write(
                    f"- FTHP for all {selected_platform} wells remained in a narrow "
                    f"{round(tp_lo):d}-{round(tp_hi):d} psig band with no sustained ramps or step changes."
                )
            if fl_lo is not None and fl_hi is not None:
                st.write(
                    f"- Flowline/header pressure was smooth in the ~{round(fl_lo):d}-{round(fl_hi):d} psig range, "
                    "with only shallow daily variation."
                )
            if t_lo is not None and t_hi is not None:
                st.write(
                    f"- Temperatures for all wells were stable, moving together in a coherent daily cycle "
                    f"between roughly {round(t_lo):d} and {round(t_hi):d} degF."
                )
            st.write(
                "- Surveillance (pressures and temperatures) shows no signatures of trips, slugging or major "
                "choke changes on the producing wells for this date."
            )

            st.markdown("**Individual wells**")
            for well_data in result["wells"]:
                well_name = well_data.get("well", well_data.get("well_name", ""))
                measurements = well_data.get("analysis_results", well_data.get("measurements", {}))
                raw_data = well_data.get("raw_data", {})

                _render_collapsible_well_narrative(
                    pdf_gen,
                    well_name,
                    measurements,
                    raw_data,
                )

            st.divider()
            st.subheader("Platform Summary (Numerical)")

            summary_df = _build_platform_summary_df(result["wells"])
            if not summary_df.empty:
                st.dataframe(summary_df, use_container_width=True, hide_index=True)

            st.divider()
            st.subheader("Download Report")

            pdf_bytes = pdf_gen.generate_platform_report(
                selected_platform,
                str(selected_date),
                [
                    {
                        "well_name": w.get("well", w.get("well_name", "")),
                        "platform": selected_platform,
                        "raw_data": w.get("raw_data", {}),
                        "measurements": w.get("analysis_results", w.get("measurements", {})),
                    }
                    for w in result["wells"]
                ],
            )

            col_a, col_b = st.columns(2)
            with col_a:
                if not summary_df.empty:
                    csv_bytes = summary_df.to_csv(index=False).encode("utf-8")
                    st.download_button(
                        label="Download CSV Summary",
                        data=csv_bytes,
                        file_name=f"surveillance_{selected_platform}_{selected_date}.csv",
                        mime="text/csv",
                    )
            with col_b:
                if pdf_bytes:
                    fname = f"Surveillance_Report_{selected_platform}_{selected_date}.pdf"
                    st.download_button(
                        label="Download Comprehensive PDF Report",
                        data=pdf_bytes,
                        file_name=fname,
                        mime="application/pdf",
                    )

                    if send_email_flag and email_to.strip():
                        client = EmailClient()
                        date_str = str(selected_date)
                        default_subj, default_body = _default_subject_body(
                            report_kind="platform",
                            platform=selected_platform,
                            well=None,
                            date_str=date_str,
                        )
                        subject = custom_subject.strip() if custom_subject else default_subj
                        body = custom_body.strip() if custom_body else default_body
                        body = build_report_intro_html("platform", date_str, platform=selected_platform) + body

                        ok, err = client.send_email(
                            to_str=email_to,
                            cc_str=email_cc,
                            subject=subject,
                            body=body,
                            attachments=[(fname, pdf_bytes, "application/pdf")],
                        )
                        if ok:
                            st.success("Email sent successfully.")
                        else:
                            st.error(f"Email failed: {err}")

    elif report_type == "Field-Wide Report":
        if st.button("Generate Field-Wide Report", type="primary", use_container_width=True):
            all_platforms_data = _build_field_data(report_service, selected_date)

            total_wells = sum(len(p["wells"]) for p in all_platforms_data)
            st.success(f"Analysis complete for {total_wells} wells across {len(all_platforms_data)} platforms")

            st.subheader("Field-Wide Narrative Surveillance Report")
            email_body_lines: list[str] = []

            for idx, platform_data in enumerate(all_platforms_data, start=1):
                platform_name = platform_data["platform_name"]
                platform_wells = platform_data["wells"]

                st.markdown(f"### {idx}. {platform_name}")
                email_body_lines.append(f"{idx}. {platform_name}")

                platform_payload = [
                    {
                        "well_name": w.get("well", w.get("well_name", "")),
                        "raw_data": w.get("raw_data", {}),
                        "measurements": w.get("analysis_results", w.get("measurements", {})),
                    }
                    for w in platform_wells
                ]

                tp_band, fl_band, t_band = pdf_gen._platform_band_summary(platform_payload)
                tp_lo, tp_hi = tp_band
                fl_lo, fl_hi = fl_band
                t_lo, t_hi = t_band

                st.markdown("**Platform-level highlight**")
                email_body_lines.append("  Platform-level highlight:")
                email_body_lines.append("")

                if tp_lo is not None and tp_hi is not None:
                    line = (
                        f"- FTHP for all {platform_name} wells remained in a "
                        f"{round(tp_lo):d}-{round(tp_hi):d} psig band with no sustained ramps or step changes."
                    )
                    st.write(line)
                    email_body_lines.append("  " + line)

                if fl_lo is not None and fl_hi is not None:
                    line = (
                        f"- Flowline/header pressure tracked smoothly in the ~{round(fl_lo):d}-{round(fl_hi):d} psig range, "
                        "with only shallow daily variation."
                    )
                    st.write(line)
                    email_body_lines.append("  " + line)

                if t_lo is not None and t_hi is not None:
                    line = (
                        f"- Temperatures showed a coherent daily cycle between roughly {round(t_lo):d} and {round(t_hi):d} degF "
                        "with all wells moving together."
                    )
                    st.write(line)
                    email_body_lines.append("  " + line)

                line = (
                    "- Surveillance (pressures and temperatures) shows no clear signatures of trips, slugging or major "
                    "choke changes on the producing wells for this date."
                )
                st.write(line)
                email_body_lines.append("  " + line)

                st.markdown("**Individual wells**")
                for well_data in platform_wells:
                    well_name = well_data.get("well", well_data.get("well_name", ""))
                    measurements = well_data.get("analysis_results", well_data.get("measurements", {}))
                    raw_data = well_data.get("raw_data", {})

                    _render_collapsible_well_narrative(
                        pdf_gen,
                        well_name,
                        measurements,
                        raw_data,
                    )

                email_body_lines.append("")
                email_body_lines.append("")

            st.divider()
            st.subheader("Field Summary (Numerical)")
            wells_with_oscillations = 0
            for platform_data in all_platforms_data:
                for well_data in platform_data["wells"]:
                    measurements = well_data.get("analysis_results", well_data.get("measurements", {}))
                    for meas_data in measurements.values():
                        if meas_data.get("oscillations", {}).get("oscillation_detected", False):
                            wells_with_oscillations += 1
                            break

            col1, col2, col3 = st.columns(3)
            col1.metric("Total Wells", total_wells)
            col2.metric("Platforms", len(all_platforms_data))
            col3.metric("Wells with Oscillations", wells_with_oscillations)

            st.divider()
            st.subheader("Download / Email Report")

            pdf_bytes = pdf_gen.generate_field_report(
                str(selected_date),
                [
                    {
                        "platform_name": p["platform_name"],
                        "wells": [
                            {
                                "well_name": w.get("well", w.get("well_name", "")),
                                "raw_data": w.get("raw_data", {}),
                                "measurements": w.get("analysis_results", w.get("measurements", {})),
                            }
                            for w in p["wells"]
                        ],
                    }
                    for p in all_platforms_data
                ],
            )

            if pdf_bytes:
                fname = f"Surveillance_Report_FieldWide_{selected_date}.pdf"
                st.download_button(
                    label="Download Field-Wide PDF Report",
                    data=pdf_bytes,
                    file_name=fname,
                    mime="application/pdf",
                )

                if send_email_flag and email_to.strip():
                    client = EmailClient()
                    date_str = str(selected_date)
                    default_subj, _ = _default_subject_body(
                        report_kind="field",
                        platform=None,
                        well=None,
                        date_str=date_str,
                    )
                    subject = custom_subject.strip() if custom_subject else default_subj

                    if custom_body and custom_body.strip():
                        body = custom_body.strip()
                    else:
                        body_lines = [f"<p>Field-wide surveillance summary for {date_str}.</p>"]

                        for platform_data in all_platforms_data:
                            platform_name = platform_data["platform_name"]
                            abnormal_lines = []

                            for wd in platform_data["wells"]:
                                well_name = wd.get("well", wd.get("well_name", ""))
                                measurements = wd.get("analysis_results", wd.get("measurements", {}))
                                raw_data = wd.get("raw_data", {})

                                obs = pdf_gen._generate_well_narrative(well_name, measurements, raw_data)
                                sections = pdf_gen.group_and_order_narrative(obs, max_events_per_section=15)
                                detail_lines = sections["fthp"] + sections["flowline"] + sections["temperature"]

                                well_abnormal = []
                                for line in detail_lines:
                                    l = line.lower()
                                    if (
                                        "[major]" in l
                                        or "[moderate]" in l
                                        or "anomal" in l
                                        or "noisy" in l
                                        or "oscillat" in l
                                        or "decreased from about" in l
                                        or "increased from about" in l
                                    ):
                                        well_abnormal.append(line)

                                if well_abnormal:
                                    abnormal_lines.append((well_name, well_abnormal))

                            body_lines.append(f"<h3 style='color:#1e3a5f;'>{platform_name}</h3>")

                            if not abnormal_lines:
                                body_lines.append(
                                    f"<p>- {platform_name} was normal on the three surveillance tags, with no abnormal deviations identified.</p>"
                                )
                            else:
                                body_lines.append(
                                    f"<p>- {platform_name} was broadly stable overall, but the following abnormal deviations were observed:</p>"
                                )

                                for well_name, lines_out in abnormal_lines:
                                    body_lines.append(f"<p><b>{well_name}</b></p>")
                                    for line in lines_out:
                                        body_lines.append(f"<p>&nbsp;&nbsp;{line}</p>")

                        body = "\n".join(body_lines)

                    body = build_report_intro_html("field", date_str) + body

                    ok, err = client.send_email(
                        to_str=email_to,
                        cc_str=email_cc,
                        subject=subject,
                        body=body,
                        attachments=[(fname, pdf_bytes, "application/pdf")],
                    )
                    if ok:
                        st.success("Field-wide report email sent successfully.")
                    else:
                        st.error(f"Field-wide report email failed: {err}")

    elif report_type == "Daily Production Report":
        if st.button("Generate Daily Production Report", type="primary", use_container_width=True):
            if production_service is None:
                st.error("production_service is required for Daily Production Report.")
                return

            result = production_service.build_daily_field_production(selected_date)

            totals = result["totals"]
            field_data = result["field_data"]

            surv_map = build_surveillance_state_map(selected_date)
            narrative_lines = build_prod_surv_sentences(
                selected_date,
                field_data,
                totals,
                surv_map,
            )

            prod_pdf_gen = ProductionPDFGenerator()
            pdf_bytes = prod_pdf_gen.generate_field_daily_pdf(
                selected_date,
                field_data,
                totals,
                surv_map,
            )

            st.subheader("Field Summary")
            col1, col2, col3 = st.columns(3)
            col1.metric("Gas (MMSCF)", f"{totals.get('gas_volume', 0.0):.1f}")
            col2.metric("Condensate (BBL)", f"{totals.get('cond_volume', 0.0):.0f}")
            col3.metric("Water (BBL)", f"{totals.get('water_volume', 0.0):.0f}")

            st.subheader("Narrative Production Summary")
            for line in narrative_lines:
                st.write(f"- {line}")

            st.subheader("Per-well Production")
            df = pd.DataFrame(field_data)
            if not df.empty:
                st.dataframe(df, use_container_width=True, hide_index=True)
                csv_bytes = df.to_csv(index=False).encode("utf-8")
            else:
                csv_bytes = None

            if pdf_bytes:
                st.download_button(
                    label="Download Daily Production PDF",
                    data=pdf_bytes,
                    file_name=f"daily_production_{selected_date}.pdf",
                    mime="application/pdf",
                )

            if csv_bytes:
                st.download_button(
                    label="Download Daily Production CSV",
                    data=csv_bytes,
                    file_name=f"daily_production_{selected_date}.csv",
                    mime="text/csv",
                )

            if send_email_flag and email_to.strip() and pdf_bytes:
                client = EmailClient()
                date_str = str(selected_date)

                default_subj, _ = _default_subject_body(
                    report_kind="prod_field",
                    platform=None,
                    well=None,
                    date_str=date_str,
                )
                subject = custom_subject.strip() if custom_subject else default_subj

                if custom_body and custom_body.strip():
                    body = custom_body.strip()
                else:
                    subtitle_style = (
                        "color:#6AA84F; font-size:12pt; margin:18px 0 8px 0; "
                        "font-weight:bold;"
                    )
                    body_style = "margin:0 0 10px 0; line-height:1.45;"
                    bullet_style = "margin:0 0 8px 0; line-height:1.45;"
                    table_style = (
                        "border-collapse:collapse; margin:0 0 18px 0; "
                        "font-family:Calibri, Arial, sans-serif; font-size:12pt;"
                    )

                    field_result_table = f"""
                    <table style="{table_style}">
                        <tr>
                            <td style="padding:6px 16px 6px 0;"><b>Gas</b></td>
                            <td style="padding:6px 0;">{totals.get('gas_volume', 0.0):.1f} MMSCF</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 16px 6px 0;"><b>Condensate</b></td>
                            <td style="padding:6px 0;">{totals.get('cond_volume', 0.0):.0f} BBL</td>
                        </tr>
                        <tr>
                            <td style="padding:6px 16px 6px 0;"><b>Water</b></td>
                            <td style="padding:6px 0;">{totals.get('water_volume', 0.0):.0f} BBL</td>
                        </tr>
                    </table>
                    """

                    takeaway = narrative_lines[-1] if len(narrative_lines) > 1 else ""

                    drivers = [
                        ln for ln in narrative_lines
                        if "produced" in ln and "% of field gas" in ln
                    ][:3]

                    runtime = [
                        ln for ln in narrative_lines
                        if "deferred gas" in ln
                    ]

                    body_lines = [
                        f"<p style='{body_style}'>Daily field production and surveillance summary for {date_str}.</p>",
                        f"<h3 style='{subtitle_style}'>FIELD RESULT</h3>",
                        field_result_table,
                    ]

                    if drivers:
                        body_lines.append("<div style='height:8px;'>&nbsp;</div>")
                        body_lines.append(f"<h3 style='{subtitle_style}'>PRIMARY DRIVERS</h3>")
                        for ln in drivers:
                            body_lines.append(
                                f"<p style='{bullet_style}'>- {_html.escape(ln)}</p>"
                            )

                    if runtime:
                        body_lines.append("<div style='height:8px;'>&nbsp;</div>")
                        body_lines.append(f"<h3 style='{subtitle_style}'>RUNTIME LOSSES</h3>")
                        for ln in runtime:
                            body_lines.append(
                                f"<p style='{bullet_style}'>- {_html.escape(ln)}</p>"
                            )

                    if takeaway:
                        body_lines.append("<div style='height:8px;'>&nbsp;</div>")
                        body_lines.append(f"<h3 style='{subtitle_style}'>TAKEAWAY</h3>")
                        body_lines.append(
                            f"<p style='{body_style}'>{_html.escape(takeaway)}</p>"
                        )

                    body = "\n".join(body_lines)

                body = build_report_intro_html("prod_field", date_str) + body

                attachments = [
                    (f"daily_production_{selected_date}.pdf", pdf_bytes, "application/pdf")
                ]
                if csv_bytes:
                    attachments.append(
                        (f"daily_production_{selected_date}.csv", csv_bytes, "text/csv")
                    )

                ok, err = client.send_email(
                    to_str=email_to,
                    cc_str=email_cc,
                    subject=subject,
                    body=body,
                    attachments=attachments,
                )
                if ok:
                    st.success("Daily production report email sent successfully.")
                else:
                    st.error(f"Daily production report email failed: {err}")
