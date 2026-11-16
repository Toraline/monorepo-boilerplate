import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Pagination } from "@repo/ui/components";

const TOTAL_PAGES = 3;

const labels = {
  navigation: "Pages of the list",
  previous: "Previous",
  next: "Next",
  status: "Page 2 of 3",
};

/** The two buttons that move between the pages of a list. It shows nothing when the list has one page. */
const meta = {
  title: "Project/Pagination",
  component: Pagination,
  args: { page: 2, totalPages: TOTAL_PAGES, onPageChange: fn(), labels },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A page in the middle: both buttons work. */
export const MiddlePage: Story = {};

/** The first page: the button "Previous" is disabled. */
export const FirstPage: Story = {
  args: { page: 1, labels: { ...labels, status: "Page 1 of 3" } },
};

/** The last page: the button "Next" is disabled. */
export const LastPage: Story = {
  args: { page: 3, labels: { ...labels, status: "Page 3 of 3" } },
};

/** The buttons really change the page, as in an app. */
export const Working: Story = {
  render: function WorkingPagination(args) {
    const [page, setPage] = useState(1);

    return (
      <Pagination
        {...args}
        page={page}
        onPageChange={setPage}
        labels={{ ...labels, status: `Page ${page} of ${TOTAL_PAGES}` }}
      />
    );
  },
};
