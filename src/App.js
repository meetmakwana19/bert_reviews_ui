import "./app.scss";
import {
    Button,
    Card,
    Elevation,
    FileInput,
    Checkbox,
    Intent,
    H1,
    H2,
    TextArea,
    Dialog,
    DialogBody,
    DialogFooter,
    Icon,
    Callout,
} from "@blueprintjs/core";
import { parseCSVFile, getRandomElements } from "./utils";
import { useRef, useState } from "react";
import { submitReview, submitReviews } from "./api";
import LoadingBar from 'react-top-loading-bar'

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export const options = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top',
        },
        title: {
            display: true,
            text: 'Sentiments Bar Chart',
        },
    },
};

const labels = ['Sentiments'];

var positive_count = 0;
var negative_count = 0;
var neutral_count = 0;


function App() {

    const [postiveCount, setPostiveCount] = useState(0)
    const [negativeCount, setNegativeCount] = useState(0)
    const [neutralCount, setNeutralCount] = useState(0)

    const [progress, setProgress] = useState(0)

    const [files, setFiles] = useState(null);
    const [fileSelectorText, setFileSelectorText] = useState(
        "Choose a CSV file..."
    );
    const [review, setReview] = useState("");
    const [reviews, setReviews] = useState([]);
    const [selectedReviews, setSelectedReviews] = useState({});
    const [reviewSelectMode, setReviewSelectMode] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [singleEvaluation, setSingleEvaluation] = useState(null);

    const toggleReviewSelectMode = () => {
        setReviewSelectMode((current) => !current);
    };

    const selectReview = ({ id, text, checked }) => {
        if (!checked) {
            const { [id]: foo, ...remaining } = selectedReviews;
            setSelectedReviews(remaining);
        } else {
            setSelectedReviews({ ...selectedReviews, [id]: text });
        }
    };

    const filesSelected = (event) => {
        setFiles(event.target.files);
        setFileSelectorText(event.target.files[0].name);
    };

    const getData = async () => {
        const reviews = await parseCSVFile(files[0]);
        setReviews(reviews);
        setFiles([]);
        setImportDialogOpen(false);
    };

    const selectRandomReviews = () => {
        setReviewSelectMode((current) => !current);
        const revs = getRandomElements(reviews, 30);
        const newRevs = {};
        revs.forEach(({ id, text }) => (newRevs[id] = text));
        setSelectedReviews({ ...selectedReviews, ...newRevs });
    };

    const submitReviewsForAnalysis = async () => {
        setProgress(30)
        const payload = [];
        for (const [key, value] of Object.entries(selectedReviews)) {
            payload.push({ id: key, text: value });
            setProgress(50)
        }
        setProgress(65)
        const response = await submitReviews(payload);
        setEvaluation(response);
        setProgress(100)
        if (response.total_count) {
            setPostiveCount(response.total_count["POS"])
            setNegativeCount(response.total_count["NEG"])
            setNeutralCount(response.total_count["NEU"])
        }
    };

    const data = {
        labels,
        datasets: [
            {
                label: 'Positive',
                data: [
                    // 98, 305
                    postiveCount
                ],
                backgroundColor: ['#b1ffa0'],
            },
            {
                label: 'Negative',
                data: [
                    negativeCount
                ],
                backgroundColor: ["#ffa0a0"],
            },
            {
                label: 'Neutral',
                data: [
                    neutralCount
                ],
                backgroundColor: ["#fbff87"],
            },
        ],
    };

    const submitReviewForAnalysis = async () => {
        console.log(review);
        if (review !== "") {
            const response = await submitReview(review);
            console.log(response);
            setSingleEvaluation(response);
        }
    }

    const footerActions = (
        <>
            <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button intent={Intent.PRIMARY} disabled={!files} onClick={getData}>
                Import
            </Button>
        </>
    );

    const highlightReview = (review) => {
        let text = review.text;
        for (const { aspect, sentiment } of review.result) {
            text = text.replace(
                aspect,
                `<span class="review review--${sentiment.toLowerCase()}">${aspect}</span>`
            );
        }
        return text;
    };

    return (
        <main>
            <LoadingBar
                color='#2D72D2'
                height={8}
                progress={progress}
            />

            <Dialog
                title="Import Data"
                icon="info-sign"
                isOpen={importDialogOpen}
                onClose={() => setImportDialogOpen(!importDialogOpen)}
            >
                <DialogBody>
                    <FileInput
                        text={fileSelectorText}
                        fill={true}
                        onInputChange={filesSelected}
                    />
                </DialogBody>
                <DialogFooter actions={footerActions} />
            </Dialog>

            <div id="board">
                <H1>Restaurant Review Analyzer</H1>
                <TextArea onChange={(e) => setReview(e.target.value)} className="review-input" growVertically={true} fill={true} />
                <Button onClick={submitReviewForAnalysis}>Analyze</Button>
                <div className="single-evaluation">
                    {singleEvaluation && (
                        <Callout className="singleReview">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: highlightReview(singleEvaluation),
                                }}
                            >
                            </div>
                        </Callout>
                    )}
                </div>
                <div className="evaluation">
                    <H2>Results</H2>
                    <Bar options={options} data={data} />

                    <table className="bp4-html-table">
                        <thead>
                            <tr>
                                <th>Aspect</th>
                                <th>
                                    <Icon
                                        icon={"thumbs-up"}
                                        size={20}
                                        intent={Intent.SUCCESS}
                                    />
                                </th>
                                <th>
                                    <Icon
                                        icon={"thumbs-down"}
                                        size={20}
                                        intent={Intent.DANGER}
                                    />
                                </th>
                                <th>
                                    <Icon
                                        icon={"help"}
                                        size={20}
                                        intent={Intent.WARNING}
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {evaluation &&
                                evaluation.aggregation &&
                                Object.entries(evaluation.aggregation).map(
                                    ([aspect, sentiments]) => {
                                        return (
                                            <tr>
                                                {/* {positive_count = positive_count + sentiments["POS"]} */}
                                                {/* {negative_count = negative_count + sentiments["NEG"]} */}
                                                {/* {neutral_count = neutral_count + sentiments["NEU"]} */}
                                                <td>{aspect}</td>
                                                <td>{sentiments["POS"]}</td>
                                                <td>{sentiments["NEG"]}</td>
                                                <td>{sentiments["NEU"]}</td>
                                            </tr>
                                        );
                                    }
                                )}
                        </tbody>
                    </table>
                    {/* <div className="aspects"></div> */}
                    <div className="evaluated-reviews">
                        {evaluation &&
                            evaluation.reviews &&
                            evaluation.reviews.map((review) => {
                                return (
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: highlightReview(review),
                                        }}
                                    />
                                );
                            })}
                    </div>
                </div>
            </div>
            <div id="sidebar">
                <div className="file-picker-actions">
                    <Button
                        minimal={true}
                        intent={Intent.PRIMARY}
                        onClick={() => setImportDialogOpen(true)}
                    >
                        Import
                    </Button>
                    <Button
                        minimal={true}
                        intent={Intent.PRIMARY}
                        onClick={toggleReviewSelectMode}
                    >
                        Select..
                    </Button>
                    <Button
                        minimal={true}
                        intent={Intent.PRIMARY}
                        onClick={selectRandomReviews}
                    >
                        Select Randomly
                    </Button>
                    <Button
                        minimal={true}
                        intent={Intent.PRIMARY}
                        onClick={() => setSelectedReviews({})}
                    >
                        Clear Selection
                    </Button>
                    <div className="submit-reviews">
                        <Button
                            disabled={Object.keys(selectedReviews).length === 0}
                            intent={Intent.PRIMARY}
                            onClick={submitReviewsForAnalysis}
                        >
                            <span>
                                Submit
                                {Object.keys(selectedReviews).length > 0 && (
                                    <span>
                                        ({Object.keys(selectedReviews).length})
                                    </span>
                                )}
                            </span>
                        </Button>
                    </div>
                </div>
                <div className="entries">
                    {reviews.map(({ id, text }) => {
                        return (
                            <Card
                                className="card"
                                key={id}
                                elevation={Elevation.ONE}
                            >
                                {reviewSelectMode === true && (
                                    <div>
                                        <Checkbox
                                            checked={
                                                selectedReviews[id] ?? false
                                            }
                                            onChange={(event) =>
                                                selectReview({
                                                    id: id,
                                                    text: text,
                                                    checked:
                                                        event.target.checked,
                                                })
                                            }
                                        />
                                    </div>
                                )}
                                <div>{text}</div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}

export default App;
